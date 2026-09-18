import { describe, expect, it } from 'vitest';
import { productSchema } from './product';

const validProduct = {
  id: 1,
  title: 'Large Flux Capacitor',
  description:
    'The Large Flux Capacitor provides the maximum motive force for your inter-dimensional aluminum automobile.',
  category: 'automotive',
  price: 9.99,
  stock: 42,
  brand: 'ACME',
  sku: 'ACM-FC-001',
  weight: 4,
  meta: { createdAt: '2025-04-30T09:41:02.053Z', updatedAt: '2025-04-30T09:41:02.053Z' },
};

const parseWith = (overrides: Record<string, unknown>) =>
  productSchema.safeParse({ ...validProduct, ...overrides });

describe('productSchema', () => {
  it('accepts the reference product from the assignment', () => {
    expect(productSchema.safeParse(validProduct).success).toBe(true);
  });

  it.each([19.99, 4.35, 0, 1299, 0.01])('accepts price %s', (price) => {
    expect(parseWith({ price }).success).toBe(true);
  });

  it('trims text fields', () => {
    const result = parseWith({ title: '  Padded title  ' });

    expect(result.success && result.data.title).toBe('Padded title');
  });

  describe('rejects', () => {
    it.each([
      ['an empty title', { title: '' }],
      ['a title with only spaces', { title: '   ' }],
      ['a title longer than 200 characters', { title: 'x'.repeat(201) }],
      ['a description longer than 2000 characters', { description: 'x'.repeat(2001) }],
      ['an empty description', { description: '' }],
      ['a category with uppercase letters', { category: 'Automotive' }],
      ['an empty category', { category: '' }],
      ['a category longer than 50 characters', { category: 'x'.repeat(51) }],
      ['a negative price', { price: -0.01 }],
      ['a price with three decimals', { price: 1.005 }],
      ['a price with many decimals', { price: 9.999 }],
      ['a NaN price', { price: Number.NaN }],
      ['an infinite price', { price: Number.POSITIVE_INFINITY }],
      ['a negative stock', { stock: -1 }],
      ['a fractional stock', { stock: 1.5 }],
      ['an empty brand', { brand: '' }],
      ['a brand longer than 100 characters', { brand: 'x'.repeat(101) }],
      ['a sku with lowercase letters', { sku: 'acm-fc-001' }],
      ['a sku with underscores', { sku: 'ACM_FC_001' }],
      ['a sku shorter than 3 characters', { sku: 'AB' }],
      ['a sku longer than 40 characters', { sku: 'A'.repeat(41) }],
      ['a zero weight', { weight: 0 }],
      ['a negative weight', { weight: -1 }],
      ['a zero id', { id: 0 }],
      ['a fractional id', { id: 1.5 }],
      [
        'a createdAt that is not an ISO datetime',
        { meta: { createdAt: 'yesterday', updatedAt: '2025-04-30T09:41:02.053Z' } },
      ],
      [
        'an updatedAt that is only a date',
        { meta: { createdAt: '2025-04-30T09:41:02.053Z', updatedAt: '2025-04-30' } },
      ],
    ])('%s', (_name, overrides) => {
      expect(parseWith(overrides).success).toBe(false);
    });

    it('a product with an unknown key', () => {
      expect(parseWith({ discount: 10 }).success).toBe(false);
    });

    it('a product missing a required field', () => {
      const withoutSku = Object.fromEntries(
        Object.entries(validProduct).filter(([key]) => key !== 'sku'),
      );

      expect(productSchema.safeParse(withoutSku).success).toBe(false);
    });
  });
});
