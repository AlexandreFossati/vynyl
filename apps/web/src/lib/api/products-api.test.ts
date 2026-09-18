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
