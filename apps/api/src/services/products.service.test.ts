import { describe, expect, it, vi } from 'vitest';
import type { ProductRow } from '../mappers/product.mapper';
import type { ProductsRepository } from '../repositories/products.repository';
import { createProductsService } from './products.service';

const row = (overrides: Partial<ProductRow> = {}): ProductRow => ({
  id: 1,
  title: 'Large Flux Capacitor',
  description: 'A capacitor.',
  category: 'automotive',
  priceCents: 1999,
  stock: 42,
  brand: 'ACME',
  sku: 'ACM-FC-001',
  weight: 4,
  createdAt: '2025-04-30T09:41:02.053Z',
  updatedAt: '2025-04-30T09:41:02.053Z',
  ...overrides,
});

const fakeRepository = (page: { rows: ProductRow[]; total: number }) => {
  const list = vi.fn<ProductsRepository['list']>().mockResolvedValue(page);
  const repository: ProductsRepository = { list };
  return { repository, list };
};

describe('products service', () => {
  it('passes limit, offset and the search term to the repository', async () => {
    const { repository, list } = fakeRepository({ rows: [], total: 0 });
    const service = createProductsService({ productsRepository: repository });

    await service.list({ limit: 10, offset: 20, q: 'flux' });

    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith({ limit: 10, offset: 20, search: 'flux' });
  });

  it('passes no search term when there is none', async () => {
    const { repository, list } = fakeRepository({ rows: [], total: 0 });
    const service = createProductsService({ productsRepository: repository });

    await service.list({ limit: 30, offset: 0 });

    expect(list.mock.calls[0]?.[0].search).toBeUndefined();
  });

  it('builds the paginated envelope with the public representation of each product', async () => {
    const { repository } = fakeRepository({
      rows: [row({ id: 1 }), row({ id: 2, sku: 'ACM-FC-002', priceCents: 599 })],
      total: 44,
    });
    const service = createProductsService({ productsRepository: repository });

    const response = await service.list({ limit: 2, offset: 4 });

    expect(response.total).toBe(44);
    expect(response.limit).toBe(2);
    expect(response.offset).toBe(4);
    expect(response.data.map((product) => [product.id, product.price])).toEqual([
      [1, 19.99],
      [2, 5.99],
    ]);
    expect(response.data[0]?.meta).toEqual({
      createdAt: '2025-04-30T09:41:02.053Z',
      updatedAt: '2025-04-30T09:41:02.053Z',
    });
    expect(response.data[0]).not.toHaveProperty('priceCents');
  });

  it('returns an empty page when the repository finds nothing', async () => {
    const { repository } = fakeRepository({ rows: [], total: 0 });
    const service = createProductsService({ productsRepository: repository });

    expect(await service.list({ limit: 30, offset: 0 })).toEqual({
      data: [],
      total: 0,
      limit: 30,
      offset: 0,
    });
  });

  it('propagates a repository failure unchanged', async () => {
    const failure = new Error('database is down');
    const list = vi.fn<ProductsRepository['list']>().mockRejectedValue(failure);
    const service = createProductsService({ productsRepository: { list } });

    await expect(service.list({ limit: 30, offset: 0 })).rejects.toBe(failure);
  });
});
