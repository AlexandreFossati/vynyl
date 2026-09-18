import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-error';
import { createHttpClient, type HttpClientOptions } from './http-client';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const errorBody = (code: string, message = 'Something went wrong') => ({
  error: { code, message },
});

// Settles into a value, so a rejection is never left unhandled while the fake clock advances.
const settle = <T>(promise: Promise<T>) =>
  promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

// A fetch that never answers and rejects when it is aborted, like the real one.
const hangingFetch = () =>
  vi.fn<typeof fetch>(
    (_input, init) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted', 'AbortError')),
        );
      }),
  );

describe('http client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Every client in these tests shares a fetch double and a jitter source that always waits the
  // full ceiling, which keeps the delays predictable.
  const build = (fetchMock: typeof fetch, options: HttpClientOptions = {}) =>
    createHttpClient({ fetch: fetchMock, random: () => 1, ...options });

  describe('requests', () => {
    it('sends the query without undefined values and returns the parsed JSON', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json(200, { total: 0 }));

      const result = await build(fetchMock).request('/api/products', {
        query: { limit: 30, offset: 0, q: undefined },
      });

      expect(result).toEqual({ total: 0 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/products?limit=30&offset=0');
      expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('GET');
    });

    it('prefixes the base URL and encodes query values', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json(200, {}));

      await build(fetchMock, { baseUrl: 'http://api.test' }).request('/api/products', {
        query: { q: 'flux & co' },
      });

      expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/api/products?q=flux+%26+co');
    });

    it('sends an object body as JSON', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json(201, { id: 1 }));

      await build(fetchMock).request('/api/products', { method: 'post', body: { title: 'A' } });

      const init = fetchMock.mock.calls[0]?.[1];
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe('{"title":"A"}');
      expect(init?.headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('resolves with undefined for 204', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(null, { status: 204 }));

      await expect(build(fetchMock).request('/api/products/1', { method: 'DELETE' })).resolves.toBe(
        undefined,
      );
    });
  });

  describe('errors', () => {
    it('keeps the code, message and details of the API error envelope', async () => {
      const details = [{ path: 'title', message: 'Required' }];
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          json(400, { error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details } }),
        );

      const outcome = await settle(build(fetchMock).request('/api/products'));

      expect(outcome.ok).toBe(false);
      const error = (outcome as { error: unknown }).error;
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details,
      });
    });

    it('reports UNKNOWN when the error response is not the API envelope', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }));

      const outcome = await settle(build(fetchMock, { retries: 0 }).request('/api/products'));

      expect(outcome).toMatchObject({ ok: false, error: { status: 502, code: 'UNKNOWN' } });
    });

    it('reports NETWORK_ERROR with status 0 when fetch rejects', async () => {
      const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));

      const outcome = await settle(
        build(fetchMock, { retries: 0 }).request('/api/products', { method: 'POST' }),
      );

      expect(outcome).toMatchObject({ ok: false, error: { status: 0, code: 'NETWORK_ERROR' } });
    });

    it('reports INVALID_RESPONSE, without retrying, when a 2xx body is not JSON', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response('not json', { status: 200 }));

      const outcome = await settle(build(fetchMock).request('/api/products'));

      expect(outcome).toMatchObject({
        ok: false,
        error: { status: 200, code: 'INVALID_RESPONSE' },
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('timeout', () => {
    it('aborts an attempt that does not answer and reports TIMEOUT', async () => {
      const fetchMock = hangingFetch();
      const pending = settle(build(fetchMock, { timeoutMs: 1000, retries: 0 }).request('/x'));

      await vi.advanceTimersByTimeAsync(999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);

      expect(await pending).toMatchObject({ ok: false, error: { status: 0, code: 'TIMEOUT' } });
    });

    it('retries a timed out GET', async () => {
      // The first call hangs (and is aborted by the timeout), the second one succeeds.
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockImplementationOnce(hangingFetch())
        .mockResolvedValueOnce(json(200, { ok: true }));
      const pending = settle(build(fetchMock, { timeoutMs: 1000 }).request('/x'));

      await vi.advanceTimersByTimeAsync(1000 + 300);

      expect(await pending).toEqual({ ok: true, value: { ok: true } });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancellation', () => {
    it('rejects with AbortError and does not retry when the caller aborts mid-request', async () => {
      const fetchMock = hangingFetch();
      const controller = new AbortController();
      const pending = settle(build(fetchMock).request('/x', { signal: controller.signal }));

      controller.abort();
      const outcome = await pending;
      await vi.advanceTimersByTimeAsync(60_000);

      expect(outcome).toMatchObject({ ok: false, error: { name: 'AbortError' } });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects immediately when the wait before a retry is cancelled', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockImplementation(async () => json(503, errorBody('INTERNAL_ERROR')));
      const controller = new AbortController();
      const pending = settle(build(fetchMock).request('/x', { signal: controller.signal }));

      await vi.advanceTimersByTimeAsync(100);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      controller.abort();
      const outcome = await pending;
      await vi.advanceTimersByTimeAsync(60_000);

      expect(outcome).toMatchObject({ ok: false, error: { name: 'AbortError' } });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not call fetch when the signal is already aborted', async () => {
      const fetchMock = vi.fn<typeof fetch>();
      const controller = new AbortController();
      controller.abort();

      const outcome = await settle(build(fetchMock).request('/x', { signal: controller.signal }));

      expect(outcome).toMatchObject({ ok: false, error: { name: 'AbortError' } });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('retry', () => {
    it('repeats a GET until it succeeds', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(503, errorBody('INTERNAL_ERROR')))
        .mockResolvedValueOnce(json(503, errorBody('INTERNAL_ERROR')))
        .mockResolvedValueOnce(json(200, { ok: true }));
      const pending = settle(build(fetchMock).request('/x'));

      await vi.advanceTimersByTimeAsync(300 + 600);

      expect(await pending).toEqual({ ok: true, value: { ok: true } });
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('gives up after the initial attempt plus three retries and rejects with the last error', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockImplementation(async () => json(503, errorBody('INTERNAL_ERROR', 'Try later')));
      const pending = settle(build(fetchMock).request('/x'));

      await vi.advanceTimersByTimeAsync(60_000);

      expect(await pending).toMatchObject({
        ok: false,
        error: { status: 503, message: 'Try later' },
      });
      expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it.each(['GET', 'HEAD', 'PUT', 'DELETE'])('repeats %s on a network failure', async (method) => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(json(200, {}));
      const pending = settle(build(fetchMock).request('/x', { method }));

      await vi.advanceTimersByTimeAsync(300);

      expect((await pending).ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it.each([408, 429, 502, 503, 504])('repeats a GET that received %i', async (status) => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(status, errorBody('INTERNAL_ERROR')))
        .mockResolvedValueOnce(json(200, {}));
      const pending = settle(build(fetchMock).request('/x'));

      await vi.advanceTimersByTimeAsync(300);

      expect((await pending).ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it.each(['POST', 'PATCH'])(
      'never repeats %s, on failure or on network error',
      async (method) => {
        const failing = vi
          .fn<typeof fetch>()
          .mockImplementation(async () => json(503, errorBody('INTERNAL_ERROR')));
        const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));

        const first = settle(build(failing).request('/x', { method, body: {} }));
        const second = settle(build(offline).request('/x', { method, body: {} }));
        await vi.advanceTimersByTimeAsync(60_000);

        expect((await first).ok).toBe(false);
        expect((await second).ok).toBe(false);
        expect(failing).toHaveBeenCalledTimes(1);
        expect(offline).toHaveBeenCalledTimes(1);
      },
    );

    it.each([400, 404, 409, 500])('does not repeat a GET that received %i', async (status) => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockImplementation(async () => json(status, errorBody('VALIDATION_ERROR')));
      const pending = settle(build(fetchMock).request('/x'));

      await vi.advanceTimersByTimeAsync(60_000);

      expect((await pending).ok).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('backoff', () => {
    it('waits 300, 600 and 1200 ms when the jitter takes the full ceiling', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockImplementation(async () => json(503, errorBody('INTERNAL_ERROR')));
      const pending = settle(build(fetchMock).request('/x'));
      await vi.advanceTimersByTimeAsync(0);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      for (const [wait, calls] of [
        [300, 2],
        [600, 3],
        [1200, 4],
      ] as const) {
        await vi.advanceTimersByTimeAsync(wait - 1);
        expect(fetchMock).toHaveBeenCalledTimes(calls - 1);
        await vi.advanceTimersByTimeAsync(1);
        expect(fetchMock).toHaveBeenCalledTimes(calls);
      }
      await pending;
    });

    it('applies the jitter to the ceiling', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(503, errorBody('INTERNAL_ERROR')))
        .mockResolvedValueOnce(json(200, {}));
      const pending = settle(build(fetchMock, { random: () => 0.5 }).request('/x'));

      await vi.advanceTimersByTimeAsync(149);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);

      expect((await pending).ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('caps the wait at the ceiling', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockImplementation(async () => json(503, errorBody('INTERNAL_ERROR')));
      const pending = settle(
        build(fetchMock, { baseDelayMs: 4000, maxDelayMs: 5000, retries: 2 }).request('/x'),
      );

      await vi.advanceTimersByTimeAsync(4000); // first wait: 4000
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(4999); // second wait would be 8000, capped at 5000
      expect(fetchMock).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1);
      expect(fetchMock).toHaveBeenCalledTimes(3);
      await pending;
    });
  });

  describe('Retry-After', () => {
    it('waits the number of seconds the server asks for', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(429, errorBody('RATE_LIMITED'), { 'Retry-After': '2' }))
        .mockResolvedValueOnce(json(200, {}));
      const pending = settle(build(fetchMock).request('/x'));

      await vi.advanceTimersByTimeAsync(1999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);

      expect((await pending).ok).toBe(true);
    });

    it('accepts an HTTP date', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          json(503, errorBody('INTERNAL_ERROR'), {
            'Retry-After': 'Thu, 01 Jan 2026 00:00:03 GMT',
          }),
        )
        .mockResolvedValueOnce(json(200, {}));
      const pending = settle(build(fetchMock).request('/x'));

      await vi.advanceTimersByTimeAsync(2999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);

      expect((await pending).ok).toBe(true);
    });

    it('never waits longer than the ceiling', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(429, errorBody('RATE_LIMITED'), { 'Retry-After': '120' }))
        .mockResolvedValueOnce(json(200, {}));
      const pending = settle(build(fetchMock).request('/x'));

      await vi.advanceTimersByTimeAsync(4999);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);

      expect((await pending).ok).toBe(true);
    });

    it('falls back to the backoff when the header is not understood', async () => {
      const fetchMock = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(json(429, errorBody('RATE_LIMITED'), { 'Retry-After': 'soon' }))
        .mockResolvedValueOnce(json(200, {}));
      const pending = settle(build(fetchMock).request('/x'));

      await vi.advanceTimersByTimeAsync(300);

      expect((await pending).ok).toBe(true);
    });
  });
});
