import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestApp, TEST_SETTINGS } from '../test/app';
import { LEVEL } from '../test/log-capture';

const WINDOW_MS = 60_000;
const settings = (overrides: { limit?: number; trustProxy?: number } = {}) => ({
  ...TEST_SETTINGS,
  rateLimit: { limit: overrides.limit ?? 2, windowMs: WINDOW_MS },
  trustProxy: overrides.trustProxy ?? 0,
});

const validProduct = {
  title: 'Small Flux Capacitor',
  description: 'An entry-level capacitor.',
  category: 'automotive',
  price: 19.99,
  stock: 120,
  brand: 'ACME',
  sku: 'ACM-FC-003',
  weight: 1.5,
};

describe('rate limiting', () => {
  let close: (() => void) | undefined;

  afterEach(async () => {
    vi.useRealTimers();
    close?.();
    close = undefined;
  });

  const build = async (overrides?: { limit?: number; trustProxy?: number }) => {
    const testApp = await createTestApp({ settings: settings(overrides) });
    close = testApp.close;
    return testApp;
  };

  it('describes the policy and the remaining budget on responses within the limit', async () => {
    const { app } = await build({ limit: 2 });

    const response = await request(app).get('/api/products').expect(200);

    expect(response.headers['ratelimit-policy']).toBe('2;w=60');
    expect(response.headers['ratelimit']).toMatch(/limit=2, remaining=1, reset=\d+/);
  });

  it('answers 429 with the error envelope and a Retry-After once the limit is exceeded', async () => {
    const { app, capture } = await build({ limit: 2 });
    await request(app).get('/api/products').expect(200);
    await request(app).get('/api/products').expect(200);

    const response = await request(app).get('/api/products').expect(429);

    expect(response.body).toEqual({
      error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
    });
    const retryAfter = Number(response.headers['retry-after']);
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(WINDOW_MS / 1000);
    expect(
      capture
        .entries()
        .some((entry) => entry.level === LEVEL.warn && entry.res?.statusCode === 429),
    ).toBe(true);
  });

  it('does not run the blocked operation', async () => {
    const { app } = await build({ limit: 1 });
    await request(app).get('/api/products').expect(200);

    await request(app).post('/api/products').send(validProduct).expect(429);

    // Once the window passes, the listing shows that the blocked POST created nothing.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + WINDOW_MS + 1);
    const listing = await request(app).get('/api/products').expect(200);
    expect(listing.body.total).toBe(0);
  });

  it('serves the client again after the window has passed', async () => {
    const { app } = await build({ limit: 1 });
    vi.useFakeTimers({ toFake: ['Date'] });
    await request(app).get('/api/products').expect(200);
    await request(app).get('/api/products').expect(429);

    vi.setSystemTime(Date.now() + WINDOW_MS + 1);

    await request(app).get('/api/products').expect(200);
  });

  it('counts requests to unknown routes under /api', async () => {
    const { app } = await build({ limit: 2 });

    await request(app).get('/api/unknown').expect(404);
    await request(app).get('/api/unknown').expect(404);
    await request(app).get('/api/unknown').expect(429);
  });

  it('ignores a varying X-Forwarded-For by default', async () => {
    const { app } = await build({ limit: 2 });

    await request(app).get('/api/products').set('X-Forwarded-For', '10.0.0.1').expect(200);
    await request(app).get('/api/products').set('X-Forwarded-For', '10.0.0.2').expect(200);
    await request(app).get('/api/products').set('X-Forwarded-For', '10.0.0.3').expect(429);
  });

  it('counts distinct forwarded clients separately when one proxy is trusted', async () => {
    const { app } = await build({ limit: 1, trustProxy: 1 });

    await request(app).get('/api/products').set('X-Forwarded-For', '10.0.0.1').expect(200);
    await request(app).get('/api/products').set('X-Forwarded-For', '10.0.0.2').expect(200);
    await request(app).get('/api/products').set('X-Forwarded-For', '10.0.0.1').expect(429);
  });
});
