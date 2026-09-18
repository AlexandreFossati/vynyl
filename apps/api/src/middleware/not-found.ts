import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors';

// Last route of the app: anything that reached it matched no route.
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError('NOT_FOUND', 'Route not found'));
};
