import { apiErrorSchema } from '@vynyl/shared';
import { ApiError } from './api-error';

// Only methods that are safe to repeat: a repeated POST could create the same thing twice.
const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'PUT', 'DELETE']);
const RETRYABLE_STATUSES = new Set([408, 429, 502, 503, 504]);

export interface HttpClientOptions {
  baseUrl?: string;
  // Per attempt, covering the response headers and body.
  timeoutMs?: number;
  // Repetitions after the first attempt.
  retries?: number;
  baseDelayMs?: number;
  factor?: number;
  maxDelayMs?: number;
  // Injectable so tests can control the network and the jitter.
  fetch?: typeof globalThis.fetch;
  random?: () => number;
}

export interface RequestOptions {
  method?: string;
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  signal?: AbortSignal | undefined;
}

export interface HttpClient {
  // Resolves with the parsed JSON body (undefined for 204) or rejects with an ApiError,
  // or with an AbortError when the caller cancels.
  request(path: string, options?: RequestOptions): Promise<unknown>;
}

type Outcome =
  { ok: true; value: unknown } | { ok: false; error: ApiError; retryAfterMs?: number | undefined };

const abortError = () => new DOMException('The request was aborted', 'AbortError');

// Retry-After is either a number of seconds or an HTTP date.
function parseRetryAfter(header: string | null): number | undefined {
  if (header === null) {
    return undefined;
  }
  const value = header.trim();
  if (/^\d+$/.test(value)) {
    return Number(value) * 1000;
  }
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - Date.now());
}

function toApiError(status: number, text: string): ApiError {
  try {
    const envelope = apiErrorSchema.safeParse(JSON.parse(text));
    if (envelope.success) {
      const { code, message, details } = envelope.data.error;
      return new ApiError({ status, code, message, ...(details ? { details } : {}) });
    }
  } catch {
    // Not JSON (for example an HTML error page from a proxy): handled below.
  }
  return new ApiError({
    status,
    code: 'UNKNOWN',
    message: `Request failed with status ${status}`,
  });
}

// Waits, but ends early (rejecting) when the caller cancels.
function sleep(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const {
    baseUrl = '',
    timeoutMs = 10_000,
    retries = 3,
    baseDelayMs = 300,
    factor = 2,
    maxDelayMs = 5_000,
    fetch: fetchImpl = (...args) => globalThis.fetch(...args),
    random = Math.random,
  } = options;

  const buildUrl = (path: string, query: RequestOptions['query']) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) {
        params.set(key, String(value));
      }
    }
    const search = params.toString();
    return `${baseUrl}${path}${search ? `?${search}` : ''}`;
  };

  // One attempt. Transport failures become outcomes; only a cancellation by the caller throws.
  async function attempt(
    url: string,
    init: RequestInit,
    signal: AbortSignal | undefined,
  ): Promise<Outcome> {
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onCallerAbort = () => controller.abort();
    signal?.addEventListener('abort', onCallerAbort, { once: true });

    try {
      const response = await fetchImpl(url, { ...init, signal: controller.signal });
      const text = response.status === 204 ? '' : await response.text();

      if (!response.ok) {
        return {
          ok: false,
          error: toApiError(response.status, text),
          retryAfterMs: parseRetryAfter(response.headers.get('Retry-After')),
        };
      }
      if (response.status === 204) {
        return { ok: true, value: undefined };
      }
      try {
        return { ok: true, value: JSON.parse(text) as unknown };
      } catch (cause) {
        return {
          ok: false,
          error: new ApiError(
            {
              status: response.status,
              code: 'INVALID_RESPONSE',
              message: 'The server response was not valid JSON',
            },
            { cause },
          ),
        };
      }
    } catch (cause) {
      if (signal?.aborted) {
        throw abortError();
      }
      const error = timedOut
        ? new ApiError({ status: 0, code: 'TIMEOUT', message: 'The request timed out' }, { cause })
        : new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Network error' }, { cause });
      return { ok: false, error };
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onCallerAbort);
    }
  }

  const isRetryable = (error: ApiError) =>
    error.code === 'NETWORK_ERROR' ||
    error.code === 'TIMEOUT' ||
    RETRYABLE_STATUSES.has(error.status);

  // Full jitter: a random wait between 0 and the exponential ceiling. A server-provided
  // Retry-After replaces it, but never exceeds the ceiling of the backoff.
  const delayBeforeRetry = (retryNumber: number, retryAfterMs: number | undefined) =>
    retryAfterMs === undefined
      ? random() * Math.min(maxDelayMs, baseDelayMs * factor ** retryNumber)
      : Math.min(retryAfterMs, maxDelayMs);

  return {
    async request(path, { method = 'GET', query, body, signal } = {}) {
      const verb = method.toUpperCase();
      const url = buildUrl(path, query);
      const init: RequestInit = {
        method: verb,
        ...(body === undefined
          ? {}
          : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      };
      const mayRetry = IDEMPOTENT_METHODS.has(verb);

      for (let retryNumber = 0; ; retryNumber += 1) {
        if (signal?.aborted) {
          throw abortError();
        }
        const outcome = await attempt(url, init, signal);
        if (outcome.ok) {
          return outcome.value;
        }
        if (!mayRetry || !isRetryable(outcome.error) || retryNumber >= retries) {
          throw outcome.error;
        }
        await sleep(delayBeforeRetry(retryNumber, outcome.retryAfterMs), signal);
      }
    },
  };
}
