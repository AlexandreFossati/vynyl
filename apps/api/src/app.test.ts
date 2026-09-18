import { apiErrorSchema, productListResponseSchema, type Product } from '@vynyl/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { products } from './db/schema';
import { createTestApp, dataset, type TestApp } from './test/app';
import { LEVEL } from './test/log-capture';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const idsOf = (body: { data: Array<{ id: number }> }) => body.data.map((product) => product.id);
const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_unused, index) => from + index);
const containsText = (product: Product, term: string) =>
  `${product.title} ${product.description}`.toLowerCase().includes(term.toLowerCase());

describe('GET /api/products', () => {
  // Read-only scenarios share one seeded app; scenarios that change data build their own.
  let shared: TestApp;

  beforeAll(async () => {
    shared = await createTestApp({ seed: true });
  });

  afterAll(() => {
    shared.close();
  });

  const get = (path: string) => request(shared.app).get(path);

  describe('default listing', () => {
    it('returns the first 30 products in id order with the total of the catalog', async () => {
      const response = await get('/api/products');

      expect(response.status).toBe(200);
      expect(idsOf(response.body)).toEqual(range(1, 30));
      expect(response.body).toMatchObject({ total: dataset.length, limit: 30, offset: 0 });
      expect(dataset.length).toBe(44);
    });

    it('satisfies the shared response contract', async () => {
      const response = await get('/api/products');

      expect(productListResponseSchema.safeParse(response.body).success).toBe(true);
    });

    it('returns an empty page for an empty catalog', async () => {
      const empty = await createTestApp();

      const response = await request(empty.app).get('/api/products');
      empty.close();

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [], total: 0, limit: 30, offset: 0 });
    });
  });

  describe('product representation', () => {
    it('exposes the reference product exactly as in the dataset', async () => {
      const response = await get('/api/products');

      expect(response.body.data[0]).toEqual(dataset[0]);
      expect(response.body.data[0]).toMatchObject({
        id: 1,
        title: 'Large Flux Capacitor',
        category: 'automotive',
        price: 9.99,
        stock: 42,
        brand: 'ACME',
        sku: 'ACM-FC-001',
        weight: 4,
        meta: { createdAt: '2025-04-30T09:41:02.053Z', updatedAt: '2025-04-30T09:41:02.053Z' },
      });
    });

    it('has no fields besides the public ones', async () => {
      const response = await get('/api/products');

      expect(Object.keys(response.body.data[0]).sort()).toEqual(
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

    it('exposes the price in currency units, not cents', async () => {
      const own = await createTestApp();
      await own.db.insert(products).values({
        title: 'Priced',
        description: 'Stored as 1999 cents',
        category: 'tools',
        priceCents: 1999,
        stock: 1,
        brand: 'ACME',
        sku: 'PRICE-001',
        weight: 1,
      });

      const response = await request(own.app).get('/api/products');
      own.close();

      expect(response.body.data[0].price).toBe(19.99);
    });
  });

  describe('pagination', () => {
    it('serves the second page with limit=10&offset=10', async () => {
      const response = await get('/api/products?limit=10&offset=10');

      expect(idsOf(response.body)).toEqual(range(11, 20));
      expect(response.body).toMatchObject({ total: 44, limit: 10, offset: 10 });
    });

    it('serves a partial last page', async () => {
      const response = await get('/api/products?offset=30');

      expect(idsOf(response.body)).toEqual(range(31, 44));
      expect(response.body.total).toBe(44);
    });

    it('accepts the maximum limit', async () => {
      const response = await get('/api/products?limit=100');

      expect(idsOf(response.body)).toEqual(range(1, 44));
      expect(response.body.limit).toBe(100);
    });

    it('returns an empty page when the offset is past the end', async () => {
      const response = await get('/api/products?offset=1000');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ data: [], total: 44, limit: 30, offset: 1000 });
    });
  });

  describe('query validation', () => {
    it.each([
      ['limit=0', 'limit'],
      ['limit=101', 'limit'],
      ['limit=abc', 'limit'],
      ['limit=1.5', 'limit'],
      ['limit=1e2', 'limit'],
      ['limit=%2B5', 'limit'],
      ['limit=', 'limit'],
      ['limit=-1', 'limit'],
      ['offset=-1', 'offset'],
      ['offset=abc', 'offset'],
      ['limit=10&limit=20', 'limit'],
      ['foo=1', ''],
      [`q=${'x'.repeat(101)}`, 'q'],
    ])('rejects %s with VALIDATION_ERROR pointing at %j', async (query, path) => {
      const response = await get(`/api/products?${query}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].path).toBe(path);
      expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
      expect(response.body).not.toHaveProperty('data');
    });
  });

  describe('search', () => {
    const flux = dataset.filter((product) => containsText(product, 'flux'));

    it('ignores letter case and matches title or description', async () => {
      const lower = await get('/api/products?q=flux&limit=100');
      const upper = await get('/api/products?q=FLUX&limit=100');

      expect(lower.body.total).toBe(flux.length);
      expect(idsOf(lower.body)).toEqual(flux.map((product) => product.id));
      expect(upper.body).toEqual(lower.body);
    });

    it('finds a product whose description, but not its title, contains the term', async () => {
      const term = 'vibration';
      const expected = dataset.filter((product) => containsText(product, term));
      expect(expected.some((product) => !product.title.toLowerCase().includes(term))).toBe(true);

      const response = await get(`/api/products?q=${term}`);

      expect(idsOf(response.body)).toEqual(expected.map((product) => product.id));
    });

    it('combines with pagination and counts only the matches', async () => {
      const response = await get('/api/products?q=flux&limit=5&offset=5');

      expect(idsOf(response.body)).toEqual(flux.slice(5, 10).map((product) => product.id));
      expect(response.body).toMatchObject({ total: flux.length, limit: 5, offset: 5 });
    });

    it('returns an empty page when nothing matches', async () => {
      const response = await get('/api/products?q=nothing-matches-this');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ data: [], total: 0 });
    });

    it('treats % as text: no product contains it, so nothing is returned', async () => {
      const response = await get('/api/products?q=%25');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ data: [], total: 0 });
    });

    it('treats _ as text, matching only products that contain an underscore', async () => {
      const own = await createTestApp();
      await own.db.insert(products).values(
        ['Under_score item', 'UnderXscore item'].map((title, index) => ({
          title,
          description: 'plain',
          category: 'tools',
          priceCents: 100,
          stock: 1,
          brand: 'ACME',
          sku: `UND-00${index + 1}`,
          weight: 1,
        })),
      );

      const response = await request(own.app).get('/api/products?q=_');
      own.close();

      expect(response.body.data.map((product: Product) => product.title)).toEqual([
        'Under_score item',
      ]);
    });

    it('treats a blank term as no search', async () => {
      const plain = await get('/api/products');
      const blank = await get('/api/products?q=%20%20');

      expect(blank.body).toEqual(plain.body);
    });

    it('trims the term', async () => {
      const trimmed = await get('/api/products?q=flux');
      const padded = await get('/api/products?q=%20flux%20');

      expect(padded.body).toEqual(trimmed.body);
    });
  });
});

describe('errors', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp({ seed: true });
  });

  afterAll(() => {
    app.close();
  });

  it.each(['/api/does-not-exist', '/qualquer-coisa'])(
    'answers 404 NOT_FOUND in JSON for GET %s',
    async (path) => {
      const response = await request(app.app).get(path);

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
    },
  );

  it('answers 500 INTERNAL_ERROR without leaking the cause when the database fails', async () => {
    const broken = await createTestApp({ seed: true });
    broken.client.close();

    const response = await request(broken.app).get('/api/products');
    await vi.waitFor(() =>
      expect(broken.capture.entries().some((entry) => entry.msg === 'Request failed')).toBe(true),
    );

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
    const failure = broken.capture.entries().find((entry) => entry.msg === 'Request failed');
    expect(failure?.level).toBe(LEVEL.error);
    expect(failure?.err?.message).toEqual(expect.any(String));
    expect(failure?.req?.id).toBe(response.headers['x-request-id']);
    expect(JSON.stringify(response.body)).not.toContain(failure?.err?.message ?? '<none>');
  });
});

describe('request headers and logging', () => {
  let app: TestApp;

  beforeAll(async () => {
    app = await createTestApp({ seed: true });
  });

  afterAll(() => {
    app.close();
  });

  it('sends X-Request-Id on success and on error responses', async () => {
    const ok = await request(app.app).get('/api/products');
    const notFound = await request(app.app).get('/nope');

    expect(ok.headers['x-request-id']).toMatch(UUID);
    expect(notFound.headers['x-request-id']).toMatch(UUID);
  });

  it('reuses a valid X-Request-Id sent by the client', async () => {
    const response = await request(app.app).get('/api/products').set('X-Request-Id', 'client-123');

    expect(response.headers['x-request-id']).toBe('client-123');
  });

  it('does not reveal the framework', async () => {
    const response = await request(app.app).get('/api/products');

    expect(response.headers).not.toHaveProperty('x-powered-by');
  });

  it('logs the request with the same id as the response and no sensitive header', async () => {
    const response = await request(app.app)
      .get('/api/products?limit=1')
      .set('Authorization', 'Bearer segredo');
    await vi.waitFor(() =>
      expect(
        app.capture.entries().some((entry) => entry.req?.id === response.headers['x-request-id']),
      ).toBe(true),
    );

    expect(app.capture.raw()).not.toContain('segredo');
  });
});
