import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { ProductsHandler } from '../handlers/products.handler';
import { AppError } from '../lib/errors';
import { getValidated } from '../middleware/validate';
import { createProductsRouter } from './products.routes';

function setup() {
  const seen: unknown[] = [];
  const list = vi.fn<RequestHandler>((_req, res) => {
    seen.push(getValidated(res, 'query'));
    res.json({ reached: true });
  });
  const productsHandler: ProductsHandler = { list };

  const errors: unknown[] = [];
  const app = express();
  app.use('/api/products', createProductsRouter({ productsHandler }));
  const collectError: ErrorRequestHandler = (error, _req, res, _next) => {
    errors.push(error);
    res.status(error instanceof AppError ? error.status : 500).end();
  };
  app.use(collectError);

  return { app, list, seen, errors };
}

describe('products router', () => {
  it('routes GET /api/products to the list handler with the validated query', async () => {
    const { app, list, seen } = setup();

    const response = await request(app).get('/api/products?limit=5&offset=10&q=flux');

    expect(response.body).toEqual({ reached: true });
    expect(list).toHaveBeenCalledTimes(1);
    expect(seen[0]).toEqual({ limit: 5, offset: 10, q: 'flux' });
  });

  it('applies the defaults before the handler runs', async () => {
    const { app, seen } = setup();

    await request(app).get('/api/products');

    expect(seen[0]).toEqual({ limit: 30, offset: 0 });
  });

  it('validates the query before calling the handler', async () => {
    const { app, list, errors } = setup();

    const response = await request(app).get('/api/products?limit=101');

    expect(response.status).toBe(400);
    expect(list).not.toHaveBeenCalled();
    expect((errors[0] as AppError).code).toBe('VALIDATION_ERROR');
  });

  it('does not define other paths or methods', async () => {
    const { app, list } = setup();

    const other = await request(app).get('/api/products/1');
    const post = await request(app).post('/api/products');

    expect(other.status).toBe(404);
    expect(post.status).toBe(404);
    expect(list).not.toHaveBeenCalled();
  });
});
