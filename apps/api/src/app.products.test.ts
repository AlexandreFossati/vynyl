import { apiErrorSchema, type Product } from '@vynyl/shared';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp, dataset, type TestApp } from './test/app';

const validBody = {
  title: 'Small Flux Capacitor',
  description: 'An entry-level capacitor.',
  category: 'automotive',
  price: 19.99,
  stock: 120,
  brand: 'ACME',
  sku: 'ACM-FC-999',
  weight: 1.5,
};

describe('product endpoints', () => {
  let ctx: TestApp;

  beforeEach(async () => {
    ctx = await createTestApp({ seed: true });
  });

  afterEach(() => {
    ctx.close();
  });

  const api = () => request(ctx.app);
  const total = async (): Promise<number> => (await api().get('/api/products?limit=1')).body.total;
  const get = async (id: number): Promise<Product> => (await api().get(`/api/products/${id}`)).body;
  const paths = (body: { error: { details?: Array<{ path: string }> } }) =>
    (body.error.details ?? []).map((detail) => detail.path);
  const highestId = Math.max(...dataset.map((product) => product.id));

  describe('GET /api/products/:id', () => {
    it('returns the product, identical to its entry in the listing', async () => {
      const list = await api().get('/api/products');

      const response = await api().get('/api/products/1');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(list.body.data[0]);
      expect(response.body).toEqual(dataset[0]);
    });

    it('answers 404 PRODUCT_NOT_FOUND for a product that does not exist', async () => {
      const response = await api().get('/api/products/9999');

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
      expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
    });
  });

  describe('identifier validation', () => {
    it.each(['abc', '0', '-1', '1.5', '1e2'])(
      'rejects the id %j on GET, PATCH and DELETE with VALIDATION_ERROR pointing at id',
      async (id) => {
        const responses = [
          await api().get(`/api/products/${id}`),
          await api().patch(`/api/products/${id}`).send({ stock: 1 }),
          await api().delete(`/api/products/${id}`),
        ];

        for (const response of responses) {
          expect(response.status).toBe(400);
          expect(response.body.error.code).toBe('VALIDATION_ERROR');
          expect(paths(response.body)).toContain('id');
        }
      },
    );
  });

  describe('POST /api/products', () => {
    it('creates the product and answers 201 with server-managed id and meta and a Location', async () => {
      const before = await total();

      const response = await api().post('/api/products').send(validBody);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({ ...validBody, id: highestId + 1 });
      expect(response.body.meta.createdAt).toBe(response.body.meta.updatedAt);
      expect(new Date(response.body.meta.createdAt).toISOString()).toBe(
        response.body.meta.createdAt,
      );
      expect(response.headers.location).toBe(`/api/products/${highestId + 1}`);
      expect(await total()).toBe(before + 1);
    });

    it('makes the created product available at the Location', async () => {
      const created = await api().post('/api/products').send(validBody);

      const fetched = await api().get(created.headers.location as string);

      expect(fetched.status).toBe(200);
      expect(fetched.body).toEqual(created.body);
    });

    it('keeps a price of 19.99 exactly', async () => {
      const created = await api().post('/api/products').send(validBody);

      expect(created.body.price).toBe(19.99);
      expect((await get(created.body.id)).price).toBe(19.99);
    });

    it.each([
      ['a server-managed id', { ...validBody, id: 1 }],
      [
        'server-managed meta',
        {
          ...validBody,
          meta: { createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z' },
        },
      ],
    ])('rejects a body with %s and creates nothing', async (_name, body) => {
      const before = await total();

      const response = await api().post('/api/products').send(body);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(await total()).toBe(before);
    });

    it('reports every invalid field', async () => {
      const response = await api()
        .post('/api/products')
        .send({ ...validBody, price: -1, sku: 'bad sku', stock: 1.5, discount: 5 });

      expect(response.status).toBe(400);
      expect(paths(response.body)).toEqual(expect.arrayContaining(['price', 'sku', 'stock', '']));
    });

    it('reports a missing required field', async () => {
      const { brand: _brand, ...withoutBrand } = validBody;

      const response = await api().post('/api/products').send(withoutBrand);

      expect(response.status).toBe(400);
      expect(paths(response.body)).toContain('brand');
    });

    it.each([
      ['an empty body', () => api().post('/api/products')],
      ['an array', () => api().post('/api/products').send([validBody])],
      [
        'a non-JSON content type',
        () => api().post('/api/products').set('Content-Type', 'text/plain').send('title=x'),
      ],
    ])('rejects %s with VALIDATION_ERROR', async (_name, send) => {
      const response = await send();

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects malformed JSON with a clear message', async () => {
      const response = await api()
        .post('/api/products')
        .set('Content-Type', 'application/json')
        .send('{"title":');

      expect(response.status).toBe(400);
      expect(response.body.error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Malformed JSON body',
      });
    });
  });

  describe('sku uniqueness', () => {
    it('answers 409 SKU_CONFLICT when creating with an existing sku and creates nothing', async () => {
      const before = await total();

      const response = await api()
        .post('/api/products')
        .send({ ...validBody, sku: dataset[0]?.sku });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SKU_CONFLICT');
      expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
      expect(await total()).toBe(before);
    });

    it('answers 409 when updating to the sku of another product and leaves it unchanged', async () => {
      const before = await get(2);

      const response = await api()
        .patch('/api/products/2')
        .send({ sku: dataset[0]?.sku, title: 'Should not be saved' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SKU_CONFLICT');
      expect(await get(2)).toEqual(before);
    });

    it('allows an update that keeps the product own sku', async () => {
      const response = await api().patch('/api/products/1').send({ sku: dataset[0]?.sku });

      expect(response.status).toBe(200);
    });
  });

  describe('PATCH /api/products/:id', () => {
    it('changes only the given field, keeps createdAt and refreshes updatedAt', async () => {
      const before = await get(1);

      const response = await api().patch('/api/products/1').send({ stock: 7 });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ...before,
        stock: 7,
        meta: { createdAt: before.meta.createdAt, updatedAt: response.body.meta.updatedAt },
      });
      expect(Date.parse(response.body.meta.updatedAt)).toBeGreaterThan(
        Date.parse(before.meta.updatedAt),
      );
      expect(await get(1)).toEqual(response.body);
    });

    it('updates the price keeping exact cents', async () => {
      const response = await api().patch('/api/products/1').send({ price: 4.35 });

      expect(response.body.price).toBe(4.35);
    });

    it.each([
      ['an empty body', {}],
      ['a server-managed id', { id: 5 }],
      [
        'server-managed meta',
        { meta: { createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z' } },
      ],
      ['an unknown field', { foo: 'bar' }],
      ['an invalid value', { stock: -1 }],
    ])('rejects %s and leaves the product unchanged', async (_name, body) => {
      const before = await get(1);

      const response = await api().patch('/api/products/1').send(body);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(await get(1)).toEqual(before);
    });

    it('answers 404 PRODUCT_NOT_FOUND for a product that does not exist', async () => {
      const response = await api().patch('/api/products/9999').send({ stock: 1 });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('removes the product: 204 without a body, then 404, and the total drops by one', async () => {
      const before = await total();

      const response = await api().delete('/api/products/1');

      expect(response.status).toBe(204);
      expect(response.text).toBe('');
      expect((await api().get('/api/products/1')).status).toBe(404);
      expect(await total()).toBe(before - 1);
    });

    it('answers 404 PRODUCT_NOT_FOUND when the removal is repeated', async () => {
      await api().delete('/api/products/1');

      const again = await api().delete('/api/products/1');

      expect(again.status).toBe(404);
      expect(again.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    it('does not reuse the id of a removed product', async () => {
      await api().delete(`/api/products/${highestId}`);

      const created = await api().post('/api/products').send(validBody);

      expect(created.body.id).toBeGreaterThan(highestId);
    });
  });
});
