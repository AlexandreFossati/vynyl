import { ERROR_CODES } from '@vynyl/shared';
import { describe, expect, it } from 'vitest';
import { AppError, STATUS_BY_CODE } from './errors';

describe('AppError', () => {
  it.each([
    ['VALIDATION_ERROR', 400],
    ['NOT_FOUND', 404],
    ['PRODUCT_NOT_FOUND', 404],
    ['SKU_CONFLICT', 409],
    ['RATE_LIMITED', 429],
    ['INTERNAL_ERROR', 500],
  ] as const)('maps %s to HTTP %i', (code, status) => {
    expect(new AppError(code, 'message').status).toBe(status);
  });

  it('has a status for every code of the shared contract', () => {
    for (const code of ERROR_CODES) {
      expect(STATUS_BY_CODE[code]).toEqual(expect.any(Number));
    }
  });

  it('preserves the message and the details', () => {
    const details = [{ path: 'limit', message: 'Too big' }];

    const error = new AppError('VALIDATION_ERROR', 'Invalid request', { details });

    expect(error.message).toBe('Invalid request');
    expect(error.details).toEqual(details);
  });

  it('has no details when none are given', () => {
    expect(new AppError('NOT_FOUND', 'Not found').details).toBeUndefined();
  });

  it('propagates the cause', () => {
    const cause = new Error('root cause');

    const error = new AppError('INTERNAL_ERROR', 'Boom', { cause });

    expect(error.cause).toBe(cause);
  });

  it('is an Error named AppError', () => {
    const error = new AppError('NOT_FOUND', 'Not found');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('AppError');
  });
});
