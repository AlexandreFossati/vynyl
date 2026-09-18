import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { apiErrorSchema } from '@vynyl/shared';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp, TEST_SETTINGS, type TestApp } from './test/app';

const INDEX_HTML = '<!doctype html><html><body><div id="app"></div></body></html>';
const APP_JS = 'console.log("spa");';
const SECRET = 'not for the web';

describe('serving the compiled SPA', () => {
  let workspace: string;
  let spaDir: string;
  let served: TestApp;
  let withoutSpa: TestApp;

  beforeAll(async () => {
    // spaDir/index.html and spaDir/assets/app.js are the SPA; secret.txt sits next to spaDir.
    workspace = mkdtempSync(join(tmpdir(), 'vynyl-spa-'));
    spaDir = join(workspace, 'dist');
    mkdirSync(join(spaDir, 'assets'), { recursive: true });
    writeFileSync(join(spaDir, 'index.html'), INDEX_HTML);
    writeFileSync(join(spaDir, 'assets', 'app.js'), APP_JS);
    writeFileSync(join(workspace, 'secret.txt'), SECRET);

    served = await createTestApp({ seed: true, spaDir });
    withoutSpa = await createTestApp();
  });

  afterAll(() => {
    served.close();
    withoutSpa.close();
    // Windows may keep a file busy for a moment: a leftover temp folder is not a failure.
    rmSync(workspace, { recursive: true, force: true, maxRetries: 3 });
  });

  const get = (path: string) => request(served.app).get(path);

  describe('client routes', () => {
    it.each(['/', '/products/new', '/products/7', '/products/7/edit', '/not-a-real-page'])(
      'answers GET %s with the SPA page',
      async (path) => {
        const response = await get(path);

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toMatch(/text\/html/);
        expect(response.text).toBe(INDEX_HTML);
      },
    );

    it('answers HEAD like GET, without a body', async () => {
      const response = await request(served.app).head('/products/7');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/text\/html/);
      expect(response.text).toBeUndefined();
    });

    it('does not turn a write outside the API into a page', async () => {
      const response = await request(served.app).post('/products/7').send({});

      expect(response.status).toBe(404);
      expect(apiErrorSchema.parse(response.body).error.code).toBe('NOT_FOUND');
    });
  });

  describe('files', () => {
    it('serves an existing file with its own type', async () => {
      const response = await get('/assets/app.js');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toMatch(/javascript/);
      expect(response.text).toBe(APP_JS);
    });

    it.each(['/assets/missing.js', '/favicon.ico', '/products/1.5'])(
      'answers a missing file, %s, with the JSON 404 and not with the page',
      async (path) => {
        const response = await get(path);

        expect(response.status).toBe(404);
        expect(response.headers['content-type']).toMatch(/application\/json/);
        expect(apiErrorSchema.parse(response.body).error.code).toBe('NOT_FOUND');
      },
    );

    // The HTTP client of tests normalizes "..", so the request is written by hand.
    const rawGet = (app: Express, path: string) =>
      new Promise<{ status: number; body: string }>((resolve, reject) => {
        const server = app.listen(0, () => {
          const { port } = server.address() as AddressInfo;
          httpRequest({ port, path, method: 'GET' }, (response) => {
            let body = '';
            response.on('data', (chunk: Buffer) => (body += chunk.toString()));
            response.on('end', () => {
              server.close();
              resolve({ status: response.statusCode ?? 0, body });
            });
          })
            .on('error', reject)
            .end();
        });
      });

    it.each(['/%2e%2e/secret.txt', '/..%2fsecret.txt', '/assets/%2e%2e/%2e%2e/secret.txt'])(
      'never serves a file from outside the SPA folder (%s)',
      async (path) => {
        const response = await rawGet(served.app, path);

        expect(response.body).not.toContain(SECRET);
      },
    );
  });

  describe('the API and the health check', () => {
    it('answers an unknown API path with the JSON 404, never with the page', async () => {
      const response = await get('/api/does-not-exist');

      expect(response.status).toBe(404);
      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(apiErrorSchema.parse(response.body).error.code).toBe('NOT_FOUND');
    });

    it('answers the bare /api and an unknown path under /health the same way', async () => {
      for (const path of ['/api', '/health/nothing']) {
        const response = await get(path);

        expect(response.status, path).toBe(404);
        expect(apiErrorSchema.parse(response.body).error.code, path).toBe('NOT_FOUND');
      }
    });

    it('keeps the API routes working', async () => {
      const response = await get('/api/products?limit=1');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ limit: 1 });
    });

    it('keeps the health check working', async () => {
      const response = await get('/health');

      expect(response.status).toBe(200);
    });
  });

  it('does not count the SPA files against the rate limit of the API', async () => {
    const limited = await createTestApp({
      spaDir,
      settings: { ...TEST_SETTINGS, rateLimit: { limit: 1, windowMs: 60_000 } },
    });

    const pages = await Promise.all(
      Array.from({ length: 5 }, () => request(limited.app).get('/products/7')),
    );
    const files = await request(limited.app).get('/assets/app.js');
    limited.close();

    expect(pages.map((response) => response.status)).toEqual([200, 200, 200, 200, 200]);
    expect(files.status).toBe(200);
  });

  describe('without a compiled SPA', () => {
    it('answers every path outside the API with the JSON 404', async () => {
      for (const path of ['/', '/products/7', '/assets/app.js']) {
        const response = await request(withoutSpa.app).get(path);

        expect(response.status, path).toBe(404);
        expect(apiErrorSchema.parse(response.body).error.code, path).toBe('NOT_FOUND');
      }
    });
  });
});
