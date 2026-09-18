import { readFileSync } from 'node:fs';
import type { Product } from '@vynyl/shared';
import type { Express } from 'express';
import { createApp, type AppSettings } from '../app';
import { getPaths } from '../config/paths';
import { seedProducts } from '../db/seed';
import { createLogCapture } from './log-capture';
import { createTestDatabase, type TestDatabase } from './database';

const { datasetFile } = getPaths(new URL('../server.ts', import.meta.url).href);

// The seed dataset as parsed from data/products.json.
export const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')) as Product[];

export interface TestApp extends TestDatabase {
  app: Express;
  capture: ReturnType<typeof createLogCapture>;
}

// Generous enough that tests never hit the limiter by accident; rate limit tests override it.
export const TEST_SETTINGS: AppSettings = {
  rateLimit: { limit: 10_000, windowMs: 60_000 },
  trustProxy: 0,
};

// Test helper: the real app on an in-memory database, optionally seeded with the real dataset,
// with its logs captured in memory.
export async function createTestApp(
  options: { seed?: boolean; settings?: AppSettings; spaDir?: string } = {},
): Promise<TestApp> {
  const database = await createTestDatabase();
  if (options.seed) {
    await seedProducts(database.db, {
      file: datasetFile,
      logger: createLogCapture('silent').logger,
    });
  }

  const capture = createLogCapture();
  const app = createApp({
    db: database.db,
    logger: capture.logger,
    settings: options.settings ?? TEST_SETTINGS,
    spaDir: options.spaDir,
  });
  return { ...database, app, capture };
}
