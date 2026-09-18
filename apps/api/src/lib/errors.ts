import type { ErrorCode, ErrorDetail } from '@vynyl/shared';

// Exhaustive on purpose: adding a code to the shared contract without an HTTP status here
// is a compile error.
export const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  PRODUCT_NOT_FOUND: 404,
  SKU_CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

// Domain and request errors. Only the central error handler turns them into HTTP responses.
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: ErrorDetail[] | undefined;

  constructor(
    code: ErrorCode,
    message: string,
    options: { details?: ErrorDetail[]; cause?: unknown } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'AppError';
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = options.details;
  }
}
