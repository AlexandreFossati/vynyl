import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createLogCapture, LEVEL } from '../test/log-capture';
import { createRequestLogger } from './request-logger';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function setup(level: Parameters<typeof createLogCapture>[0] = 'info') {
  const capture = createLogCapture(level);
  const app = express();
  app.use(createRequestLogger(capture.logger));
  app.get('/ok', (_req, res) => res.json({ ok: true }));
  app.get('/bad', (_req, res) => res.status(400).json({ bad: true }));
  app.get('/boom', (_req, res) => res.status(500).json({ boom: true }));
  return { app, capture };
}

describe('request logger', () => {
  describe('X-Request-Id', () => {
    it('generates a UUID when the client sends none', async () => {
      const { app } = setup();

      const response = await request(app).get('/ok');

      expect(response.headers['x-request-id']).toMatch(UUID);
    });

    it('reuses a valid id sent by the client', async () => {
      const { app } = setup();

      const response = await request(app).get('/ok').set('X-Request-Id', 'client-123');

      expect(response.headers['x-request-id']).toBe('client-123');
    });

    it('replaces an invalid id and never logs the rejected value', async () => {
      const { app, capture } = setup();

      const response = await request(app).get('/ok').set('X-Request-Id', 'bad id & <script>');
      await vi.waitFor(() => expect(capture.entries()).toHaveLength(1));

      expect(response.headers['x-request-id']).toMatch(UUID);
      expect(capture.raw()).not.toContain('<script>');
    });

    it('uses the same id in the response header and in the log entry', async () => {
      const { app, capture } = setup();

      const response = await request(app).get('/ok');
      await vi.waitFor(() => expect(capture.entries()).toHaveLength(1));

      expect(capture.entries()[0]?.req?.id).toBe(response.headers['x-request-id']);
    });
  });

  describe('log entry', () => {
    it('is a JSON line with request id, method, url, status and response time', async () => {
      const { app, capture } = setup();

      await request(app).get('/ok?x=1');
      await vi.waitFor(() => expect(capture.entries()).toHaveLength(1));

      const entry = capture.entries()[0];
      expect(entry?.req).toEqual({ id: expect.any(String), method: 'GET', url: '/ok?x=1' });
      expect(entry?.res).toEqual({ statusCode: 200 });
      expect(entry?.responseTime).toEqual(expect.any(Number));
    });

    it.each([
      ['/ok', LEVEL.info],
      ['/bad', LEVEL.warn],
      ['/boom', LEVEL.error],
    ])('logs %s at level %i', async (path, level) => {
      const { app, capture } = setup();

      await request(app).get(path);
      await vi.waitFor(() => expect(capture.entries()).toHaveLength(1));

      expect(capture.entries()[0]?.level).toBe(level);
    });
  });

  describe('sensitive data', () => {
    it('never logs Authorization or Cookie values, nor any request header', async () => {
      const { app, capture } = setup();

      await request(app)
        .get('/ok')
        .set('Authorization', 'Bearer segredo')
        .set('Cookie', 'session=abc');
      await vi.waitFor(() => expect(capture.entries()).toHaveLength(1));

      expect(capture.raw()).not.toContain('segredo');
      expect(capture.raw()).not.toContain('session=abc');
      expect(capture.entries()[0]?.req).not.toHaveProperty('headers');
    });

    it('does not log response bodies', async () => {
      const { app, capture } = setup();

      await request(app).get('/ok');
      await vi.waitFor(() => expect(capture.entries()).toHaveLength(1));

      expect(capture.raw()).not.toContain('"ok":true');
    });
  });

  it('writes nothing when the log level is silent', async () => {
    const { app, capture } = setup('silent');

    const response = await request(app).get('/ok');

    expect(response.status).toBe(200);
    expect(capture.raw()).toBe('');
  });
});
