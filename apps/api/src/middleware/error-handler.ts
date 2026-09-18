import type { ApiError } from '@vynyl/shared';
import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors';

const INTERNAL_ERROR_MESSAGE = 'Internal server error';

// Fixed messages: the parser's own text is never repeated to the client.
const BODY_ERROR_MESSAGES: Record<string, string> = {
  'entity.parse.failed': 'Malformed JSON body',
  'entity.too.large': 'Request body too large',
};
const DEFAULT_BODY_ERROR_MESSAGE = 'Invalid request body';

// Errors raised by the JSON body parser carry a `type` and a 4xx status. They are the client's
// fault, so they are answered as VALIDATION_ERROR (the contract has no dedicated 413 code).
function toBodyParserAppError(error: unknown): AppError | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }
  const { type, status } = error as { type?: unknown; status?: unknown };
  if (typeof type !== 'string' || typeof status !== 'number' || status < 400 || status >= 500) {
    return undefined;
  }
  return new AppError('VALIDATION_ERROR', BODY_ERROR_MESSAGES[type] ?? DEFAULT_BODY_ERROR_MESSAGE, {
    cause: error,
  });
}

// The only place that turns an error into an HTTP response. Expected errors (AppError below
// 500) are described to the client; anything else is logged in full and answered with a
// generic 500, so messages, SQL and stack traces never leave the server.
export const errorHandler: ErrorRequestHandler = (thrown, req, res, next) => {
  if (res.headersSent) {
    next(thrown);
    return;
  }

  const error = toBodyParserAppError(thrown) ?? thrown;

  if (error instanceof AppError && error.status < 500) {
    const body: ApiError = {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    };
    res.status(error.status).json(body);
    return;
  }

  req.log.error({ err: error }, 'Request failed');
  const body: ApiError = { error: { code: 'INTERNAL_ERROR', message: INTERNAL_ERROR_MESSAGE } };
  res.status(500).json(body);
};
