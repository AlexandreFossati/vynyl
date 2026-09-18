import type { Product, ProductListResponse } from '@vynyl/shared';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../lib/errors';
import type { ProductsService } from '../services/products.service';
import { createProductsHandler } from './products.handler';

const page: ProductListResponse = { data: [], total: 44, limit: 5, offset: 10 };

const product: Product = {
  id: 45,
  title: 'Small Flux Capacitor',
  description: 'An entry-level capacitor.',
  category: 'automotive',
  price: 3.49,
  stock: 120,
  brand: 'ACME',
  sku: 'ACM-FC-003',
  weight: 1.5,
  meta: { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
};

const unused = () => vi.fn().mockRejectedValue(new Error('not expected'));

function setup(service: Partial<ProductsService>, validated: Record<string, unknown>) {
  const productsService: ProductsService = {
    list: unused(),
    get: unused(),
    create: unused(),
    update: unused(),
    remove: unused(),
    ...service,
  };
  const handler = createProductsHandler({ productsService });
  const errors: unknown[] = [];

  // Stands in for the validate middleware, which runs before the handler in the real routes.
  const inject: RequestHandler = (_req, res, next) => {
    res.locals.validated = validated;
    next();
  };

  const router = express.Router();
  router.get('/', inject, handler.list);
  router.post('/', inject, handler.create);
  router.get('/:id', inject, handler.get);
  router.patch('/:id', inject, handler.update);
  router.delete('/:id', inject, handler.remove);

  const app = express();
  app.use('/api/products', router);
  const collectError: ErrorRequestHandler = (error, _req, res, _next) => {
    errors.push(error);
    res.status(error instanceof AppError ? error.status : 500).end();
  };
  app.use(collectError);

  return { app, errors };
}

describe('products handler', () => {
  describe('list', () => {
    it('calls the service once with the validated query and returns its result', async () => {
      const list = vi.fn<ProductsService['list']>().mockResolvedValue(page);
      const { app } = setup({ list }, { query: { limit: 5, offset: 10, q: 'flux' } });

      const response = await request(app).get('/api/products');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(page);
      expect(list).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledWith({ limit: 5, offset: 10, q: 'flux' });
    });
  });

  describe('get', () => {
    it('returns the product of the validated id', async () => {
      const get = vi.fn<ProductsService['get']>().mockResolvedValue(product);
      const { app } = setup({ get }, { params: { id: 45 } });

      const response = await request(app).get('/api/products/45');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(product);
      expect(get).toHaveBeenCalledWith(45);
    });

    it('lets a not found error reach the error handler', async () => {
      const failure = new AppError('PRODUCT_NOT_FOUND', 'Product 45 not found');
      const get = vi.fn<ProductsService['get']>().mockRejectedValue(failure);
      const { app, errors } = setup({ get }, { params: { id: 45 } });

      const response = await request(app).get('/api/products/45');

      expect(response.status).toBe(404);
      expect(errors[0]).toBe(failure);
    });
  });

  describe('create', () => {
    const body = { title: 'Small Flux Capacitor', sku: 'ACM-FC-003' };

    it('answers 201 with the created product and its Location', async () => {
      const create = vi.fn<ProductsService['create']>().mockResolvedValue(product);
      const { app } = setup({ create }, { body });

      const response = await request(app).post('/api/products');

      expect(response.status).toBe(201);
      expect(response.body).toEqual(product);
      expect(response.headers.location).toBe('/api/products/45');
      expect(create).toHaveBeenCalledWith(body);
    });

    it('lets a conflict reach the error handler without a Location', async () => {
      const failure = new AppError('SKU_CONFLICT', 'A product with this SKU already exists');
      const create = vi.fn<ProductsService['create']>().mockRejectedValue(failure);
      const { app, errors } = setup({ create }, { body });

      const response = await request(app).post('/api/products');

      expect(response.status).toBe(409);
      expect(response.headers.location).toBeUndefined();
      expect(errors[0]).toBe(failure);
    });
  });

  describe('update', () => {
    it('updates with the validated id and patch and returns the product', async () => {
      const update = vi.fn<ProductsService['update']>().mockResolvedValue(product);
      const { app } = setup({ update }, { params: { id: 45 }, body: { stock: 7 } });

      const response = await request(app).patch('/api/products/45');

      expect(response.status).toBe(200);
      expect(response.body).toEqual(product);
      expect(update).toHaveBeenCalledWith(45, { stock: 7 });
    });
  });

  describe('remove', () => {
    it('answers 204 without a body', async () => {
      const remove = vi.fn<ProductsService['remove']>().mockResolvedValue(undefined);
      const { app } = setup({ remove }, { params: { id: 45 } });

      const response = await request(app).delete('/api/products/45');

      expect(response.status).toBe(204);
      expect(response.text).toBe('');
      expect(remove).toHaveBeenCalledWith(45);
    });

    it('lets a service failure reach the error handler', async () => {
      const failure = new Error('service failed');
      const remove = vi.fn<ProductsService['remove']>().mockRejectedValue(failure);
      const { app, errors } = setup({ remove }, { params: { id: 45 } });

      const response = await request(app).delete('/api/products/45');

      expect(response.status).toBe(500);
      expect(errors[0]).toBe(failure);
    });
  });
});
