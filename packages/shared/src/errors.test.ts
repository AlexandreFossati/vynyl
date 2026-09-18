import { describe, expect, it } from 'vitest';
import { apiErrorSchema, ERROR_CODES } from './errors';

describe('ERROR_CODES', () => {
  it('lists exactly the six error codes of the API contract', () => {
    expect([...ERROR_CODES]).toEqual([
      'VALIDATION_ERROR',
      'NOT_FOUND',
      'PRODUCT_NOT_FOUND',
      'SKU_CONFLICT',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
    ]);
  });
});

describe('apiErrorSchema', () => {
  it('accepts an error envelope without details', () => {
    const result = apiErrorSchema.safeParse({ error: { code: 'NOT_FOUND', message: 'Not found' } });

    expect(result.success).toBe(true);
  });

  it('accepts an error envelope with details', () => {
    const result = apiErrorSchema.safeParse({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request',
        details: [{ path: 'limit', message: 'Too big' }],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown error code', () => {
    const result = apiErrorSchema.safeParse({ error: { code: 'TEAPOT', message: 'nope' } });

    expect(result.success).toBe(false);
  });

  it('rejects an envelope without a message', () => {
    const result = apiErrorSchema.safeParse({ error: { code: 'NOT_FOUND' } });

    expect(result.success).toBe(false);
  });

  it('rejects malformed details', () => {
    const result = apiErrorSchema.safeParse({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid', details: [{ path: 'limit' }] },
    });

    expect(result.success).toBe(false);
  });

  it('rejects unexpected keys so the envelope cannot drift silently', () => {
    const result = apiErrorSchema.safeParse({
      error: { code: 'NOT_FOUND', message: 'Not found', stack: 'leak' },
    });

    expect(result.success).toBe(false);
  });
});
