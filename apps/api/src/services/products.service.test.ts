import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../lib/errors';
import type { ProductRow } from '../mappers/product.mapper';
import { DuplicateSkuError, type ProductsRepository } from '../repositories/products.repository';
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

const notCalled = (name: string) =>
  vi.fn().mockRejectedValue(new Error(`${name} should not be called`));

// A complete repository whose methods fail unless a test provides them.
const buildRepository = (overrides: Partial<ProductsRepository> = {}): ProductsRepository => ({
  list: notCalled('list'),
  findById: notCalled('findById'),
  create: notCalled('create'),
  update: notCalled('update'),
  remove: notCalled('remove'),
  ...overrides,
});

const fakeRepository = (page: { rows: ProductRow[]; total: number }) => {
  const list = vi.fn<ProductsRepository['list']>().mockResolvedValue(page);
  return { repository: buildRepository({ list }), list };
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
    const service = createProductsService({ productsRepository: buildRepository({ list }) });

    await expect(service.list({ limit: 30, offset: 0 })).rejects.toBe(failure);
  });
});

const FIXED_NOW = new Date('2026-03-04T05:06:07.890Z');
const NOW_ISO = '2026-03-04T05:06:07.890Z';

const input = {
  title: 'Small Flux Capacitor',
  description: 'An entry-level capacitor.',
  category: 'automotive',
  price: 19.99,
  stock: 120,
  brand: 'ACME',
  sku: 'ACM-FC-003',
  weight: 1.5,
};

const serviceWith = (overrides: Partial<ProductsRepository>) =>
  createProductsService({
    productsRepository: buildRepository(overrides),
    now: () => FIXED_NOW,
  });

const expectAppError = async (promise: Promise<unknown>, code: string, status: number) => {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppError);
  expect(error).toMatchObject({ code, status });
  return error as AppError;
};

describe('products service: get', () => {
  it('returns the public representation of an existing product', async () => {
    const findById = vi.fn<ProductsRepository['findById']>().mockResolvedValue(row({ id: 7 }));

    const product = await serviceWith({ findById }).get(7);

    expect(findById).toHaveBeenCalledWith(7);
    expect(product).toMatchObject({ id: 7, price: 19.99 });
    expect(product).not.toHaveProperty('priceCents');
  });

  it('reports PRODUCT_NOT_FOUND when the product does not exist', async () => {
    const findById = vi.fn<ProductsRepository['findById']>().mockResolvedValue(undefined);

    await expectAppError(serviceWith({ findById }).get(9999), 'PRODUCT_NOT_FOUND', 404);
  });
});

describe('products service: create', () => {
  it('stores the input with the clock instant as both timestamps and returns the product', async () => {
    const create = vi
      .fn<ProductsRepository['create']>()
      .mockImplementation(async (values) => ({ id: 45, ...values }) as ProductRow);

    const product = await serviceWith({ create }).create(input);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ priceCents: 1999, createdAt: NOW_ISO, updatedAt: NOW_ISO }),
    );
    expect(product).toMatchObject({ id: 45, price: 19.99 });
    expect(product.meta).toEqual({ createdAt: NOW_ISO, updatedAt: NOW_ISO });
  });

  it('reports SKU_CONFLICT and keeps the cause when the sku already exists', async () => {
    const cause = new DuplicateSkuError();
    const create = vi.fn<ProductsRepository['create']>().mockRejectedValue(cause);

    const error = await expectAppError(serviceWith({ create }).create(input), 'SKU_CONFLICT', 409);

    expect(error.cause).toBe(cause);
  });

  it('propagates other failures unchanged', async () => {
    const failure = new Error('database is down');
    const create = vi.fn<ProductsRepository['create']>().mockRejectedValue(failure);

    await expect(serviceWith({ create }).create(input)).rejects.toBe(failure);
  });
});

describe('products service: update', () => {
  it('writes the changed fields and updatedAt, and never createdAt', async () => {
    const update = vi
      .fn<ProductsRepository['update']>()
      .mockImplementation(async (id, patch) => ({ ...row({ id }), ...patch }) as ProductRow);

    const product = await serviceWith({ update }).update(7, { stock: 3 });

    expect(update).toHaveBeenCalledWith(7, { stock: 3, updatedAt: NOW_ISO });
    expect(update.mock.calls[0]?.[1]).not.toHaveProperty('createdAt');
    expect(product).toMatchObject({ id: 7, stock: 3 });
    expect(product.meta.updatedAt).toBe(NOW_ISO);
  });

  it('reports PRODUCT_NOT_FOUND when nothing was updated', async () => {
    const update = vi.fn<ProductsRepository['update']>().mockResolvedValue(undefined);

    await expectAppError(
      serviceWith({ update }).update(9999, { stock: 3 }),
      'PRODUCT_NOT_FOUND',
      404,
    );
  });

  it('reports SKU_CONFLICT when the new sku belongs to another product', async () => {
    const update = vi.fn<ProductsRepository['update']>().mockRejectedValue(new DuplicateSkuError());

    await expectAppError(
      serviceWith({ update }).update(7, { sku: 'TAKEN-001' }),
      'SKU_CONFLICT',
      409,
    );
  });
});

describe('products service: remove', () => {
  it('resolves when the product was removed', async () => {
    const remove = vi.fn<ProductsRepository['remove']>().mockResolvedValue(true);

    await expect(serviceWith({ remove }).remove(7)).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith(7);
  });

  it('reports PRODUCT_NOT_FOUND when there was nothing to remove', async () => {
    const remove = vi.fn<ProductsRepository['remove']>().mockResolvedValue(false);

    await expectAppError(serviceWith({ remove }).remove(9999), 'PRODUCT_NOT_FOUND', 404);
  });
});

describe('products service: coalescing of simultaneous reads', () => {
  // A repository call that stays pending until the test releases it, so calls overlap.
  const slow = <T>(value: T) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fn = vi.fn(async () => {
      await gate;
      return value;
    });
    return { fn, release };
  };

  const page = { rows: [row()], total: 1 };
  const baseQuery = { limit: 30, offset: 0 };

  it('runs one repository list for identical simultaneous requests', async () => {
    const { fn, release } = slow(page);
    const service = serviceWith({ list: fn });

    const calls = Array.from({ length: 5 }, () => service.list(baseQuery));
    release();
    const results = await Promise.all(calls);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(results.every((result) => result.total === 1)).toBe(true);
  });

  it.each([
    ['q', { ...baseQuery, q: 'flux' }],
    ['limit', { ...baseQuery, limit: 10 }],
    ['offset', { ...baseQuery, offset: 30 }],
  ])('does not coalesce lists that differ in %s', async (_name, other) => {
    const { fn, release } = slow(page);
    const service = serviceWith({ list: fn });

    const calls = [service.list(baseQuery), service.list(other)];
    release();
    await Promise.all(calls);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('coalesces simultaneous gets of the same id but not of different ids', async () => {
    const { fn, release } = slow(row());
    const service = serviceWith({ findById: fn });

    const calls = [service.get(7), service.get(7), service.get(8)];
    release();
    await Promise.all(calls);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls).toEqual([[7], [8]]);
  });

  it('never coalesces writes', async () => {
    const { fn: create, release: releaseCreate } = slow(row());
    const { fn: update, release: releaseUpdate } = slow(row());
    const { fn: remove, release: releaseRemove } = slow(true);
    const service = serviceWith({ create, update, remove });

    const calls = [
      service.create(input),
      service.create(input),
      service.update(7, { stock: 1 }),
      service.update(7, { stock: 1 }),
      service.remove(7),
      service.remove(7),
    ];
    releaseCreate();
    releaseUpdate();
    releaseRemove();
    await Promise.all(calls);

    expect(create).toHaveBeenCalledTimes(2);
    expect(update).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenCalledTimes(2);
  });

  it('shares a repository failure with every waiter and retries on the next call', async () => {
    const failure = new Error('database is down');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const list = vi
      .fn<ProductsRepository['list']>()
      .mockImplementationOnce(async () => {
        await gate;
        throw failure;
      })
      .mockResolvedValueOnce(page);
    const service = serviceWith({ list });

    const calls = Promise.allSettled([service.list(baseQuery), service.list(baseQuery)]);
    release();
    const results = await calls;

    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected']);
    expect(list).toHaveBeenCalledTimes(1);

    await expect(service.list(baseQuery)).resolves.toMatchObject({ total: 1 });
    expect(list).toHaveBeenCalledTimes(2);
  });
});
