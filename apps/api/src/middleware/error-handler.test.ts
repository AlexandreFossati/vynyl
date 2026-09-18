import { apiErrorSchema } from '@vynyl/shared';
import express, { type Request, type Response } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../lib/errors';
import { createLogCapture, LEVEL } from '../test/log-capture';
import { errorHandler } from './error-handler';
import { notFoundHandler } from './not-found';
import { createRequestLogger } from './request-logger';

function setup() {
  const capture = createLogCapture();
  const app = express();
  app.use(createRequestLogger(capture.logger));

  app.get('/validation', () => {
    throw new AppError('VALIDATION_ERROR', 'Invalid request', {
      details: [{ path: 'limit', message: 'Too big' }],
    });
  });
  app.get('/not-found-error', () => {
    throw new AppError('NOT_FOUND', 'Nothing here');
  });
  app.get('/conflict', () => {
    throw new AppError('SKU_CONFLICT', 'SKU already exists');
  });
  app.get('/unexpected', () => {
    throw new Error('SELECT * FROM users failed at C:\\secret\\path.ts');
  });
  app.get('/async-reject', async () => {
    await Promise.resolve();
    throw new Error('async failure with internal detail');
  });
  app.get('/app-error-500', () => {
    throw new AppError('INTERNAL_ERROR', 'internal detail that must stay private');
  });

  app.use(notFoundHandler);
  app.use(errorHandler);
  return { app, capture };
}

describe('error handler', () => {
  describe('expected errors', () => {
    it('answers an AppError with the envelope, the status of its code and its details', async () => {
      const { app } = setup();

      const response = await request(app).get('/validation');

      expect(response.status).toBe(400);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.body).toEqual({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: [{ path: 'limit', message: 'Too big' }],
        },
      });
    });

    it('omits details when there are none', async () => {
      const { app } = setup();

      const response = await request(app).get('/not-found-error');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Nothing here' } });
      expect(response.body.error).not.toHaveProperty('details');
    });

    it('uses the status that belongs to each code', async () => {
      const { app } = setup();

      const response = await request(app).get('/conflict');

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('SKU_CONFLICT');
    });

    it('always produces a body that satisfies the shared envelope schema', async () => {
      const { app } = setup();

      for (const path of ['/validation', '/not-found-error', '/conflict', '/unexpected', '/nope']) {
        const response = await request(app).get(path);

        expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
      }
    });
  });

  describe('unexpected errors', () => {
    it('answers 500 INTERNAL_ERROR with a generic message and no internal detail', async () => {
      const { app } = setup();

      const response = await request(app).get('/unexpected');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      });
      const text = JSON.stringify(response.body);
      expect(text).not.toContain('SELECT');
      expect(text).not.toContain('secret');
      expect(text).not.toContain('stack');
    });

    it('logs the full error at error level with the request id of the response', async () => {
      const { app, capture } = setup();

      const response = await request(app).get('/unexpected');
      await vi.waitFor(() => expect(capture.entries().length).toBeGreaterThanOrEqual(2));

      const failure = capture.entries().find((entry) => entry.msg === 'Request failed');
      expect(failure?.level).toBe(LEVEL.error);
      expect(failure?.err?.message).toContain('SELECT * FROM users failed');
      expect(failure?.err?.stack).toEqual(expect.any(String));
      expect(failure?.req?.id).toBe(response.headers['x-request-id']);
    });

    it('handles a rejected promise from an async handler without crashing', async () => {
      const { app } = setup();

      const response = await request(app).get('/async-reject');

      expect(response.status).toBe(500);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
      expect(JSON.stringify(response.body)).not.toContain('internal detail');
    });

    it('does not describe a deliberate 5xx AppError either', async () => {
      const { app, capture } = setup();

      const response = await request(app).get('/app-error-500');
      await vi.waitFor(() =>
        expect(capture.raw()).toContain('internal detail that must stay private'),
      );

      expect(response.status).toBe(500);
      expect(response.body.error.message).toBe('Internal server error');
    });
  });

  it('delegates to the next handler when the response has already started', () => {
    const error = new Error('too late');
    const next = vi.fn();
    const json = vi.fn();
    const response = { headersSent: true, status: vi.fn(() => ({ json })) } as unknown as Response;

    errorHandler(error, {} as Request, response, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(json).not.toHaveBeenCalled();
  });
});

describe('not found handler', () => {
  it.each([
    ['GET', '/api/does-not-exist'],
    ['GET', '/'],
    ['POST', '/api/does-not-exist'],
    ['DELETE', '/anything/at/all'],
  ] as const)('answers %s %s with 404 NOT_FOUND in JSON', async (method, path) => {
    const { app } = setup();

    const response = await request(app)[method.toLowerCase() as 'get' | 'post' | 'delete'](path);

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
});
