import type { Product } from '@vynyl/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from './api-error';
import type { HttpClient } from './http-client';
import { createProductsApi } from './products-api';

const product: Product = {
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

const clientReturning = (body: unknown) => {
  const request = vi.fn<HttpClient['request']>().mockResolvedValue(body);
  return { http: { request } satisfies HttpClient, request };
};

describe('products api: list', () => {
  it('asks for /api/products with the pagination and search parameters', async () => {
    const { http, request } = clientReturning({ data: [], total: 0, limit: 30, offset: 60 });
    const controller = new AbortController();

    await createProductsApi(http).list({ limit: 30, offset: 60, q: 'flux' }, controller.signal);

    expect(request).toHaveBeenCalledWith('/api/products', {
      query: { limit: 30, offset: 60, q: 'flux' },
      signal: controller.signal,
    });
  });

  it('leaves the search term undefined when there is none', async () => {
    const { http, request } = clientReturning({ data: [], total: 0, limit: 30, offset: 0 });

    await createProductsApi(http).list({ limit: 30, offset: 0 });

    expect(request.mock.calls[0]?.[1]?.query?.q).toBeUndefined();
  });

  it('resolves with the page when the response follows the contract', async () => {
    const page = { data: [product], total: 44, limit: 30, offset: 0 };
    const { http } = clientReturning(page);

    await expect(createProductsApi(http).list({ limit: 30, offset: 0 })).resolves.toEqual(page);
  });

  it.each([
    ['a missing field', { data: [product], limit: 30, offset: 0 }],
    ['a product with the wrong shape', { data: [{ id: 'x' }], total: 1, limit: 30, offset: 0 }],
    ['something that is not an object', 'oops'],
  ])('rejects with INVALID_RESPONSE for %s', async (_name, body) => {
    const { http } = clientReturning(body);

    const failure = await createProductsApi(http)
      .list({ limit: 30, offset: 0 })
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('lets request failures through unchanged', async () => {
    const failure = new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'Network error' });
    const http: HttpClient = { request: vi.fn().mockRejectedValue(failure) };

    await expect(createProductsApi(http).list({ limit: 30, offset: 0 })).rejects.toBe(failure);
  });
});

const { id: _id, meta: _meta, ...input } = product;

describe('products api: get', () => {
  it('asks for /api/products/:id and resolves with the product', async () => {
    const { http, request } = clientReturning(product);
    const controller = new AbortController();

    const result = await createProductsApi(http).get(7, controller.signal);

    expect(request).toHaveBeenCalledWith('/api/products/7', { signal: controller.signal });
    expect(result).toEqual(product);
  });

  it.each([
    ['a missing field', { ...product, sku: undefined }],
    ['a field with the wrong type', { ...product, price: '9.99' }],
    ['something that is not an object', 'oops'],
  ])('rejects with INVALID_RESPONSE for %s', async (_name, body) => {
    const { http } = clientReturning(body);

    const failure = await createProductsApi(http)
      .get(1)
      .catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});

describe('products api: create', () => {
  it('posts the product data as JSON and resolves with the created product', async () => {
    const { http, request } = clientReturning(product);
    const controller = new AbortController();

    const result = await createProductsApi(http).create(input, controller.signal);

    expect(request).toHaveBeenCalledWith('/api/products', {
      method: 'POST',
      body: input,
      signal: controller.signal,
    });
    expect(result).toEqual(product);
  });

  it('rejects with INVALID_RESPONSE when the created product breaks the contract', async () => {
    const { http } = clientReturning({ id: 1 });

    await expect(createProductsApi(http).create(input)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('lets an error envelope through unchanged, so the caller can read its code', async () => {
    const conflict = new ApiError({ status: 409, code: 'SKU_CONFLICT', message: 'Duplicate SKU' });
    const http: HttpClient = { request: vi.fn().mockRejectedValue(conflict) };

    await expect(createProductsApi(http).create(input)).rejects.toBe(conflict);
  });
});

describe('products api: update', () => {
  it('patches /api/products/:id with the data and resolves with the updated product', async () => {
    const { http, request } = clientReturning(product);
    const controller = new AbortController();

    const result = await createProductsApi(http).update(7, { stock: 3 }, controller.signal);

    expect(request).toHaveBeenCalledWith('/api/products/7', {
      method: 'PATCH',
      body: { stock: 3 },
      signal: controller.signal,
    });
    expect(result).toEqual(product);
  });

  it('rejects with INVALID_RESPONSE when the updated product breaks the contract', async () => {
    const { http } = clientReturning(null);

    await expect(createProductsApi(http).update(7, { stock: 3 })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('lets a validation error through unchanged, with its details', async () => {
    const invalid = new ApiError({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid request',
      details: [{ path: 'price', message: 'too small' }],
    });
    const http: HttpClient = { request: vi.fn().mockRejectedValue(invalid) };

    await expect(createProductsApi(http).update(7, { price: -1 })).rejects.toBe(invalid);
  });
});

describe('products api: remove', () => {
  it('deletes /api/products/:id and resolves without a value', async () => {
    const { http, request } = clientReturning(undefined);
    const controller = new AbortController();

    const result = await createProductsApi(http).remove(7, controller.signal);

    expect(request).toHaveBeenCalledWith('/api/products/7', {
      method: 'DELETE',
      signal: controller.signal,
    });
    expect(result).toBeUndefined();
  });

  it('lets a not found error through unchanged', async () => {
    const missing = new ApiError({ status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Gone' });
    const http: HttpClient = { request: vi.fn().mockRejectedValue(missing) };

    await expect(createProductsApi(http).remove(7)).rejects.toBe(missing);
  });
});
