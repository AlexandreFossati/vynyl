import type { ErrorCode, ErrorDetail } from '@vynyl/shared';

// The API's own codes, plus the ones the client raises when there is no usable API response.
export type ApiErrorCode = ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'UNKNOWN';

// Every failed request ends as one of these, so callers branch on `code` and `status` and never
// on transport details. `status` is 0 when no HTTP response was received.
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: ErrorDetail[] | undefined;

  constructor(
    init: { status: number; code: ApiErrorCode; message: string; details?: ErrorDetail[] },
    options?: { cause?: unknown },
  ) {
    super(init.message, options);
    this.name = 'ApiError';
    this.status = init.status;
    this.code = init.code;
    this.details = init.details;
  }
}
