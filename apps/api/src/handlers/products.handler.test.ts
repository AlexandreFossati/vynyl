import type { ProductListResponse } from '@vynyl/shared';
import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { ProductsService } from '../services/products.service';
import { createProductsHandler } from './products.handler';

const page: ProductListResponse = { data: [], total: 44, limit: 5, offset: 10 };

function setup(list: ProductsService['list']) {
  const errors: unknown[] = [];
  const handler = createProductsHandler({ productsService: { list } });

  const app = express();
  // Stands in for the validate middleware, which runs before the handler in the real route.
  app.get(
    '/',
    (_req, res, next) => {
      res.locals.validated = { query: { limit: 5, offset: 10, q: 'flux' } };
      next();
    },
    handler.list,
  );
  const collectError: ErrorRequestHandler = (error, _req, res, _next) => {
    errors.push(error);
    res.status(500).end();
  };
  app.use(collectError);

  return { app, errors };
}

describe('products handler', () => {
  it('calls the service once with the validated query and returns its result as JSON', async () => {
    const list = vi.fn<ProductsService['list']>().mockResolvedValue(page);
    const { app } = setup(list);

    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(page);
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith({ limit: 5, offset: 10, q: 'flux' });
  });

  it('lets a service failure reach the error handler', async () => {
    const failure = new Error('service failed');
    const { app, errors } = setup(vi.fn<ProductsService['list']>().mockRejectedValue(failure));

    const response = await request(app).get('/');

    expect(response.status).toBe(500);
    expect(errors[0]).toBe(failure);
  });
});
