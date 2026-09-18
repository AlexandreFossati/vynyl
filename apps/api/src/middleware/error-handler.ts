import type { ApiError } from '@vynyl/shared';
import type { ErrorRequestHandler } from 'express';
import { AppError } from '../lib/errors';

const INTERNAL_ERROR_MESSAGE = 'Internal server error';

// The only place that turns an error into an HTTP response. Expected errors (AppError below
// 500) are described to the client; anything else is logged in full and answered with a
// generic 500, so messages, SQL and stack traces never leave the server.
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

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
