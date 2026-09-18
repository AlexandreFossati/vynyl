import { describe, expect, it } from 'vitest';
import { listProductsQuerySchema, productListResponseSchema } from './list-products';

const parse = (input: unknown) => listProductsQuerySchema.safeParse(input);

describe('listProductsQuerySchema', () => {
  it('applies the defaults when nothing is sent', () => {
    const result = parse({});

    expect(result.success && result.data).toEqual({ limit: 30, offset: 0 });
  });

  it.each([
    [{ limit: '1' }, { limit: 1, offset: 0 }],
    [{ limit: '100' }, { limit: 100, offset: 0 }],
    [{ offset: '0' }, { limit: 30, offset: 0 }],
    [
      { limit: '10', offset: '60' },
      { limit: 10, offset: 60 },
    ],
    [{ q: 'flux' }, { limit: 30, offset: 0, q: 'flux' }],
  ])('accepts %j', (input, expected) => {
    const result = parse(input);

    expect(result.success && result.data).toEqual(expected);
  });

  describe('rejects', () => {
    it.each([
      ['limit=0', { limit: '0' }],
      ['limit=101', { limit: '101' }],
      ['limit=abc', { limit: 'abc' }],
      ['limit=1.5', { limit: '1.5' }],
      ['limit=1e2', { limit: '1e2' }],
      ['limit=+5', { limit: '+5' }],
      ['limit=-1', { limit: '-1' }],
      ['an empty limit', { limit: '' }],
      ['a limit with spaces', { limit: ' 5 ' }],
      ['a limit beyond the safe integer range', { limit: '99999999999999999999' }],
      ['offset=-1', { offset: '-1' }],
      ['offset=abc', { offset: 'abc' }],
      ['an empty offset', { offset: '' }],
      ['a repeated limit', { limit: ['10', '20'] }],
      ['a repeated q', { q: ['a', 'b'] }],
      ['an unknown key', { foo: '1' }],
      ['a q longer than 100 characters', { q: 'x'.repeat(101) }],
    ])('%s', (_name, input) => {
      expect(parse(input).success).toBe(false);
    });

    it('reports the offending parameter in the issue path', () => {
      const result = parse({ limit: '101' });

      expect(!result.success && result.error.issues[0]?.path).toEqual(['limit']);
    });
  });

  describe('q', () => {
    it('is trimmed', () => {
      const result = parse({ q: '  flux  ' });

      expect(result.success && result.data.q).toBe('flux');
    });

    it('becomes absent when it is only spaces', () => {
      const result = parse({ q: '   ' });

      expect(result.success && result.data.q).toBeUndefined();
    });

    it('accepts exactly 100 characters, ignoring surrounding spaces', () => {
      const result = parse({ q: `${'x'.repeat(100)}   ` });

      expect(result.success && result.data.q).toBe('x'.repeat(100));
    });
  });
});

describe('productListResponseSchema', () => {
  const product = {
    id: 1,
    title: 'Large Flux Capacitor',
    description: 'A capacitor.',
    category: 'automotive',
    price: 9.99,
    stock: 42,
    brand: 'ACME',
    sku: 'ACM-FC-001',
    weight: 4,
    meta: { createdAt: '2025-04-30T09:41:02.053Z', updatedAt: '2025-04-30T09:41:02.053Z' },
  };

  it('accepts a page of products', () => {
    const result = productListResponseSchema.safeParse({
      data: [product],
      total: 44,
      limit: 30,
      offset: 0,
    });

    expect(result.success).toBe(true);
  });

  it('accepts an empty page', () => {
    const result = productListResponseSchema.safeParse({
      data: [],
      total: 0,
      limit: 30,
      offset: 0,
    });

    expect(result.success).toBe(true);
  });

  it('rejects an invalid product inside the page', () => {
    const result = productListResponseSchema.safeParse({
      data: [{ ...product, price: -1 }],
      total: 1,
      limit: 30,
      offset: 0,
    });

    expect(result.success).toBe(false);
  });

  it('rejects a page with an unknown key', () => {
    const result = productListResponseSchema.safeParse({
      data: [],
      total: 0,
      limit: 30,
      offset: 0,
      page: 1,
    });

    expect(result.success).toBe(false);
  });
});
