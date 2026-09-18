import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../lib/errors';

export interface RateLimitSettings {
  limit: number;
  windowMs: number;
}

// Caps the requests each client IP can make per window. The counters live in this process's
// memory, so the limit applies per instance; several instances would need a shared store.
// The 429 body, its log line and the status all come from the central error handler; the
// library has already set Retry-After by the time the handler runs.
export function createRateLimiter({ limit, windowMs }: RateLimitSettings): RequestHandler {
  return rateLimit({
    limit,
    windowMs,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => {
      next(new AppError('RATE_LIMITED', 'Too many requests, please try again later'));
    },
  });
}
