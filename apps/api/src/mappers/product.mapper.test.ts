import type { Product } from '@vynyl/shared';
import { describe, expect, it } from 'vitest';
import { toProduct, toProductInsert, type ProductRow } from './product.mapper';

const row: ProductRow = {
  id: 7,
  title: 'Large Flux Capacitor',
  description: 'A capacitor.',
  category: 'automotive',
  priceCents: 999,
  stock: 42,
  brand: 'ACME',
  sku: 'ACM-FC-001',
  weight: 4,
  createdAt: '2025-04-30T09:41:02.053Z',
  updatedAt: '2025-05-01T10:00:00.000Z',
};

const product: Product = {
  id: 7,
  title: 'Large Flux Capacitor',
  description: 'A capacitor.',
  category: 'automotive',
  price: 9.99,
  stock: 42,
  brand: 'ACME',
  sku: 'ACM-FC-001',
  weight: 4,
  meta: { createdAt: '2025-04-30T09:41:02.053Z', updatedAt: '2025-05-01T10:00:00.000Z' },
};

describe('toProduct', () => {
  it('maps a row to the public product', () => {
    expect(toProduct(row)).toEqual(product);
  });

  it.each([
    [999, 9.99],
    [1999, 19.99],
    [29, 0.29],
    [435, 4.35],
    [129900, 1299],
    [1, 0.01],
    [0, 0],
  ])('turns %i cents into %d', (priceCents, price) => {
    expect(toProduct({ ...row, priceCents }).price).toBe(price);
  });

  it('nests the timestamps under meta', () => {
    expect(toProduct(row).meta).toEqual({
      createdAt: '2025-04-30T09:41:02.053Z',
      updatedAt: '2025-05-01T10:00:00.000Z',
    });
  });

  it('does not expose storage details', () => {
    const output = toProduct(row);

    expect(output).not.toHaveProperty('priceCents');
    expect(output).not.toHaveProperty('createdAt');
    expect(output).not.toHaveProperty('updatedAt');
    expect(Object.keys(output).sort()).toEqual(
      [
        'brand',
        'category',
        'description',
        'id',
        'meta',
        'price',
        'sku',
        'stock',
        'title',
        'weight',
      ].sort(),
    );
  });
});

describe('toProductInsert', () => {
  it('maps a product to an insertable row, keeping id and timestamps', () => {
    expect(toProductInsert(product)).toEqual(row);
  });

  it.each([
    [9.99, 999],
    [19.99, 1999],
    [0.29, 29],
    [4.35, 435],
    [1.15, 115],
    [1299, 129900],
    [0.01, 1],
    [0, 0],
  ])('turns price %d into %i cents without floating point error', (price, priceCents) => {
    expect(toProductInsert({ ...product, price }).priceCents).toBe(priceCents);
  });

  it('round-trips through the row and back', () => {
    for (const price of [9.99, 19.99, 0.29, 4.35, 1299, 0.01]) {
      const original = { ...product, price };

      expect(toProduct({ ...toProductInsert(original) } as ProductRow)).toEqual(original);
    }
  });
});
