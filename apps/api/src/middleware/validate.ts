import type { ErrorDetail } from '@vynyl/shared';
import type { RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../lib/errors';

const SOURCES = ['query', 'params', 'body'] as const;
type Source = (typeof SOURCES)[number];

export type ValidationSchemas = Partial<Record<Source, ZodType>>;
type ValidatedData = Partial<Record<Source, unknown>>;

// Validates the request with Zod and stores the parsed values in `res.locals.validated`.
// They are not written back to `req`: in Express 5 `req.query` is a read-only getter.
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, res, next) => {
    const validated: ValidatedData = {};
    const details: ErrorDetail[] = [];

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[source]);
      if (result.success) {
        validated[source] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ path: issue.path.map(String).join('.'), message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      next(new AppError('VALIDATION_ERROR', 'Invalid request', { details }));
      return;
    }

    res.locals.validated = { ...(res.locals.validated as ValidatedData | undefined), ...validated };
    next();
  };
}

// The single place where the parsed type is asserted. Handlers must only ask for a source
// that the route validated.
export function getValidated<T>(res: Response, source: Source): T {
  const validated = res.locals.validated as ValidatedData | undefined;
  if (validated === undefined || !(source in validated)) {
    throw new Error(
      `No validated ${source} found: is the validate middleware mounted on this route?`,
    );
  }
  return validated[source] as T;
}
