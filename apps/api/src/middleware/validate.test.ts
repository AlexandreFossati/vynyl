import express, { type ErrorRequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { AppError } from '../lib/errors';
import { getValidated, validate } from './validate';

const whole = z.string().regex(/^\d+$/, 'must be a non-negative integer').transform(Number);

function setup() {
  const errors: unknown[] = [];
  const app = express();
  app.use(express.json());

  app.get(
    '/items/:id',
    validate({
      query: z.strictObject({ limit: whole.default(30) }),
      params: z.strictObject({ id: whole }),
    }),
    (req, res) => {
      res.json({
        query: getValidated(res, 'query'),
        params: getValidated(res, 'params'),
        rawQuery: req.query,
      });
    },
  );

  app.post(
    '/echo',
    validate({ body: z.strictObject({ name: z.string().min(1) }) }),
    (_req, res) => {
      res.json({ body: getValidated(res, 'body') });
    },
  );

  app.get('/query-only', validate({ query: z.strictObject({}) }), (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/unguarded', (_req, res) => {
    res.json(getValidated(res, 'query'));
  });

  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    errors.push(error);
    res.status(error instanceof AppError ? error.status : 500).json({ handled: true });
  };
  app.use(handleError);

  return { app, errors };
}

describe('validate', () => {
  it('stores the parsed query and params in res.locals and leaves req.query untouched', async () => {
    const { app } = setup();

    const response = await request(app).get('/items/42?limit=10');

    expect(response.body).toEqual({
      query: { limit: 10 },
      params: { id: 42 },
      rawQuery: { limit: '10' },
    });
  });

  it('applies the schema defaults', async () => {
    const { app } = setup();

    const response = await request(app).get('/items/1');

    expect(response.body.query).toEqual({ limit: 30 });
  });

  it('validates the body', async () => {
    const { app } = setup();

    const response = await request(app).post('/echo').send({ name: 'Flux' });

    expect(response.body).toEqual({ body: { name: 'Flux' } });
  });

  describe('when validation fails', () => {
    it('forwards a VALIDATION_ERROR AppError whose details point at the field', async () => {
      const { app, errors } = setup();

      const response = await request(app).get('/items/1?limit=abc');

      expect(response.status).toBe(400);
      const error = errors[0] as AppError;
      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual([{ path: 'limit', message: 'must be a non-negative integer' }]);
    });

    it('reports an issue on the object itself (unknown key) with an empty path', async () => {
      const { app, errors } = setup();

      await request(app).get('/query-only?foo=1');

      expect((errors[0] as AppError).details?.[0]?.path).toBe('');
    });

    it('collects the problems of every validated source', async () => {
      const { app, errors } = setup();

      await request(app).get('/items/abc?limit=abc');

      const paths = (errors[0] as AppError).details?.map((detail) => detail.path).sort();
      expect(paths).toEqual(['id', 'limit']);
    });

    it('rejects an invalid body', async () => {
      const { app, errors } = setup();

      const response = await request(app).post('/echo').send({ name: '' });

      expect(response.status).toBe(400);
      expect((errors[0] as AppError).details?.[0]?.path).toBe('name');
    });

    it('does not run the handler', async () => {
      const { app } = setup();

      const response = await request(app).get('/items/1?limit=abc');

      expect(response.body).toEqual({ handled: true });
    });
  });

  it('does not validate sources that have no schema', async () => {
    const { app } = setup();

    const response = await request(app).get('/query-only');

    expect(response.status).toBe(200);
  });
});

describe('getValidated', () => {
  it('throws a clear error when the route did not validate that source', async () => {
    const { app, errors } = setup();

    const response = await request(app).get('/unguarded');

    expect(response.status).toBe(500);
    expect((errors[0] as Error).message).toContain('No validated query found');
  });
});
