import { readFileSync } from 'node:fs';
import type { Product } from '@vynyl/shared';
import type { Express } from 'express';
import { createApp } from '../app';
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

// Test helper: the real app on an in-memory database, optionally seeded with the real dataset,
// with its logs captured in memory.
export async function createTestApp(options: { seed?: boolean } = {}): Promise<TestApp> {
  const database = await createTestDatabase();
  if (options.seed) {
    await seedProducts(database.db, {
      file: datasetFile,
      logger: createLogCapture('silent').logger,
    });
  }

  const capture = createLogCapture();
  const app = createApp({ db: database.db, logger: capture.logger });
  return { ...database, app, capture };
}
