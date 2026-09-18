import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { ProductsHandler } from '../handlers/products.handler';
import { AppError } from '../lib/errors';
import { getValidated } from '../middleware/validate';
import { createProductsRouter } from './products.routes';

const validBody = {
  title: 'Small Flux Capacitor',
  description: 'An entry-level capacitor.',
  category: 'automotive',
  price: 3.49,
  stock: 120,
  brand: 'ACME',
  sku: 'ACM-FC-003',
  weight: 1.5,
};

function setup() {
  const seen: Record<string, unknown[]> = {};
  const spy = (name: string, sources: Array<'query' | 'params' | 'body'>): RequestHandler =>
    vi.fn<RequestHandler>((_req, res) => {
      seen[name] = sources.map((source) => getValidated(res, source));
      res.json({ reached: name });
    });

  const productsHandler: ProductsHandler = {
    list: spy('list', ['query']),
    get: spy('get', ['params']),
    create: spy('create', ['body']),
    update: spy('update', ['params', 'body']),
    remove: spy('remove', ['params']),
  };

  const errors: unknown[] = [];
  const app = express();
  app.use(express.json());
  app.use('/api/products', createProductsRouter({ productsHandler }));
  const collectError: ErrorRequestHandler = (error, _req, res, _next) => {
    errors.push(error);
    res.status(error instanceof AppError ? error.status : 500).end();
  };
  app.use(collectError);

  return { app, seen, errors, productsHandler };
}

describe('products router', () => {
  describe('GET /api/products', () => {
    it('routes to list with the validated query and the defaults applied', async () => {
      const { app, seen } = setup();

      await request(app).get('/api/products?limit=5&offset=10&q=flux');
      await request(app).get('/api/products');

      expect(seen.list).toEqual([{ limit: 30, offset: 0 }]);
    });

    it('validates the query before calling the handler', async () => {
      const { app, productsHandler, errors } = setup();

      const response = await request(app).get('/api/products?limit=101');

      expect(response.status).toBe(400);
      expect(productsHandler.list).not.toHaveBeenCalled();
      expect((errors[0] as AppError).code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/products/:id', () => {
    it('routes to get with the id converted to a number', async () => {
      const { app, seen } = setup();

      const response = await request(app).get('/api/products/42');

      expect(response.body).toEqual({ reached: 'get' });
      expect(seen.get).toEqual([{ id: 42 }]);
    });

    it.each(['abc', '0', '-1', '1.5', '1e2'])(
      'rejects the id %j before the handler',
      async (id) => {
        const { app, productsHandler, errors } = setup();

        const response = await request(app).get(`/api/products/${id}`);

        expect(response.status).toBe(400);
        expect(productsHandler.get).not.toHaveBeenCalled();
        expect((errors[0] as AppError).details?.[0]?.path).toBe('id');
      },
    );
  });

  describe('POST /api/products', () => {
    it('routes to create with the validated body', async () => {
      const { app, seen } = setup();

      await request(app).post('/api/products').send(validBody);

      expect(seen.create).toEqual([validBody]);
    });

    it.each([
      ['a server-managed id', { ...validBody, id: 1 }],
      ['an unknown field', { ...validBody, discount: 5 }],
      ['a negative price', { ...validBody, price: -1 }],
      ['an empty object', {}],
    ])('rejects a body with %s before the handler', async (_name, body) => {
      const { app, productsHandler } = setup();

      const response = await request(app).post('/api/products').send(body);

      expect(response.status).toBe(400);
      expect(productsHandler.create).not.toHaveBeenCalled();
    });

    it('rejects a body that is not JSON', async () => {
      const { app, productsHandler } = setup();

      const response = await request(app)
        .post('/api/products')
        .set('Content-Type', 'text/plain')
        .send('title=x');

      expect(response.status).toBe(400);
      expect(productsHandler.create).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/products/:id', () => {
    it('routes to update with the id and the partial body', async () => {
      const { app, seen } = setup();

      await request(app).patch('/api/products/7').send({ stock: 3 });

      expect(seen.update).toEqual([{ id: 7 }, { stock: 3 }]);
    });

    it.each([
      ['an empty body', {}],
      ['a server-managed id', { id: 1 }],
      ['an invalid value', { stock: -1 }],
    ])('rejects %s before the handler', async (_name, body) => {
      const { app, productsHandler } = setup();

      const response = await request(app).patch('/api/products/7').send(body);

      expect(response.status).toBe(400);
      expect(productsHandler.update).not.toHaveBeenCalled();
    });

    it('reports problems of both the id and the body together', async () => {
      const { app, errors } = setup();

      await request(app).patch('/api/products/abc').send({ stock: -1 });

      const paths = (errors[0] as AppError).details?.map((detail) => detail.path).sort();
      expect(paths).toEqual(['id', 'stock']);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('routes to remove with the validated id', async () => {
      const { app, seen } = setup();

      await request(app).delete('/api/products/9');

      expect(seen.remove).toEqual([{ id: 9 }]);
    });

    it('rejects an invalid id before the handler', async () => {
      const { app, productsHandler } = setup();

      const response = await request(app).delete('/api/products/abc');

      expect(response.status).toBe(400);
      expect(productsHandler.remove).not.toHaveBeenCalled();
    });
  });

  it('defines no other methods or paths', async () => {
    const { app } = setup();

    const put = await request(app).put('/api/products/1').send(validBody);
    const nested = await request(app).get('/api/products/1/extra');

    expect(put.status).toBe(404);
    expect(nested.status).toBe(404);
  });
});
