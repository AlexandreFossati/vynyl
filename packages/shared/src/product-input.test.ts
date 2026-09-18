import { describe, expect, it } from 'vitest';
import {
  createProductInputSchema,
  productIdParamsSchema,
  updateProductInputSchema,
} from './product-input';

const validInput = {
  title: 'Small Flux Capacitor',
  description: 'An entry-level capacitor.',
  category: 'automotive',
  price: 3.49,
  stock: 120,
  brand: 'ACME',
  sku: 'ACM-FC-003',
  weight: 1.5,
};

describe('createProductInputSchema', () => {
  it('accepts a valid body', () => {
    expect(createProductInputSchema.safeParse(validInput).success).toBe(true);
  });

  it.each([
    ['id', { id: 1 }],
    [
      'meta',
      { meta: { createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' } },
    ],
    ['an unknown key', { discount: 10 }],
  ])('rejects a body with %s', (_name, extra) => {
    expect(createProductInputSchema.safeParse({ ...validInput, ...extra }).success).toBe(false);
  });

  it.each([
    ['a negative price', { price: -1 }],
    ['a price with three decimals', { price: 1.005 }],
    ['a sku outside the pattern', { sku: 'acm-fc' }],
    ['a negative stock', { stock: -1 }],
    ['a zero weight', { weight: 0 }],
    ['an uppercase category', { category: 'Automotive' }],
    ['an empty title', { title: '' }],
  ])('applies the product rule: %s', (_name, override) => {
    expect(createProductInputSchema.safeParse({ ...validInput, ...override }).success).toBe(false);
  });

  it('rejects a body missing a required field', () => {
    const withoutBrand = Object.fromEntries(
      Object.entries(validInput).filter(([key]) => key !== 'brand'),
    );

    expect(createProductInputSchema.safeParse(withoutBrand).success).toBe(false);
  });

  it.each([undefined, null, [], 'text'])('rejects %j as a body', (body) => {
    expect(createProductInputSchema.safeParse(body).success).toBe(false);
  });
});

describe('updateProductInputSchema', () => {
  it('accepts a single field', () => {
    expect(updateProductInputSchema.safeParse({ stock: 7 }).success).toBe(true);
  });

  it('accepts every field at once', () => {
    expect(updateProductInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('rejects an empty patch', () => {
    const result = updateProductInputSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0]?.message).toBe(
      'at least one field is required',
    );
  });

  it.each([
    ['id', { id: 1 }],
    [
      'meta',
      { meta: { createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' } },
    ],
    ['an unknown key', { foo: 1 }],
    ['an invalid value', { stock: -1 }],
  ])('rejects a patch with %s', (_name, patch) => {
    expect(updateProductInputSchema.safeParse({ title: 'ok', ...patch }).success).toBe(false);
  });
});

describe('productIdParamsSchema', () => {
  it.each([
    ['1', 1],
    ['42', 42],
  ])('accepts %j', (id, expected) => {
    const result = productIdParamsSchema.safeParse({ id });

    expect(result.success && result.data.id).toBe(expected);
  });

  it.each(['abc', '0', '-1', '1.5', '1e2', '', ' 1', '+1', '99999999999999999999'])(
    'rejects %j',
    (id) => {
      expect(productIdParamsSchema.safeParse({ id }).success).toBe(false);
    },
  );

  it('rejects a repeated or missing id', () => {
    expect(productIdParamsSchema.safeParse({ id: ['1', '2'] }).success).toBe(false);
    expect(productIdParamsSchema.safeParse({}).success).toBe(false);
  });
});
