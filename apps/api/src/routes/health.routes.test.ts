import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, TEST_SETTINGS, type TestApp } from '../test/app';
import { LEVEL } from '../test/log-capture';

describe('GET /health', () => {
  let testApp: TestApp | undefined;

  afterEach(() => {
    testApp?.close();
    testApp = undefined;
  });

  it('reports ok, uncached, while the database answers', async () => {
    testApp = await createTestApp();

    const response = await request(testApp.app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('reports unavailable without leaking the failure, and logs the cause with the request id', async () => {
    testApp = await createTestApp();
    testApp.close();

    const response = await request(testApp.app).get('/health');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: 'unavailable' });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.text).not.toMatch(/closed|sqlite|select/i);

    const failure = testApp.capture
      .entries()
      .find((entry) => entry.level === LEVEL.error && entry.msg === 'Health check failed');
    expect(failure?.err?.message).toBeTruthy();
    expect(failure?.req?.id).toBe(response.headers['x-request-id']);
  });

  it('keeps answering while /api is blocked by the rate limit', async () => {
    testApp = await createTestApp({
      settings: { ...TEST_SETTINGS, rateLimit: { limit: 1, windowMs: 60_000 } },
    });
    await request(testApp.app).get('/api/products').expect(200);
    await request(testApp.app).get('/api/products').expect(429);

    await request(testApp.app).get('/health').expect(200);
    await request(testApp.app).get('/health').expect(200);
  });

  it('answers 404 to methods other than GET', async () => {
    testApp = await createTestApp();

    const response = await request(testApp.app).post('/health');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });
});
