import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Product } from '@vynyl/shared';
import { asc } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { getPaths } from '../config/paths';
import { toProduct } from '../mappers/product.mapper';
import { createLogCapture } from '../test/log-capture';
import { createTestDatabase, type TestDatabase } from '../test/database';
import { products } from './schema';
import { SeedError, seedProducts } from './seed';

const { datasetFile } = getPaths(new URL('../server.ts', import.meta.url).href);
const dataset = JSON.parse(readFileSync(datasetFile, 'utf8')) as Product[];

const makeProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 1,
  title: 'Test product',
  description: 'A product used by the seed tests.',
  category: 'tools',
  price: 10,
  stock: 5,
  brand: 'ACME',
  sku: 'TST-001',
  weight: 1,
  meta: { createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-02T00:00:00.000Z' },
  ...overrides,
});

describe('seedProducts', () => {
  let database: TestDatabase;
  let directory: string;

  beforeAll(() => {
    directory = mkdtempSync(join(tmpdir(), 'vynyl-seed-'));
  });

  afterAll(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  afterEach(() => {
    database.close();
  });

  const writeDataset = (name: string, content: unknown): string => {
    const file = join(directory, name);
    writeFileSync(file, typeof content === 'string' ? content : JSON.stringify(content));
    return file;
  };

  const rows = () => database.db.select().from(products).orderBy(asc(products.id));

  const seed = async (file: string) => {
    const { logger } = createLogCapture();
    return seedProducts(database.db, { file, logger });
  };

  describe('with the real dataset', () => {
    it('inserts every product preserving ids, fields and timestamps', async () => {
      database = await createTestDatabase();

      const result = await seed(datasetFile);

      expect(result).toEqual({ inserted: dataset.length, skipped: false });
      expect((await rows()).map(toProduct)).toEqual(dataset);
    });

    it('does not insert anything on a second run', async () => {
      database = await createTestDatabase();
      await seed(datasetFile);

      const second = await seed(datasetFile);

      expect(second).toEqual({ inserted: 0, skipped: true });
      expect(await rows()).toHaveLength(dataset.length);
    });

    it('logs when the seed is skipped', async () => {
      database = await createTestDatabase();
      await seed(datasetFile);
      const capture = createLogCapture();

      await seedProducts(database.db, { file: datasetFile, logger: capture.logger });

      expect(capture.entries().map((entry) => entry.msg)).toContain(
        'Catalog already populated, seed skipped',
      );
    });

    it('continues the automatic id sequence after the highest seeded id', async () => {
      database = await createTestDatabase();
      await seed(datasetFile);
      const highestId = Math.max(...dataset.map((product) => product.id));

      const [inserted] = await database.db
        .insert(products)
        .values({
          title: 'Added later',
          description: 'Inserted without an id',
          category: 'tools',
          priceCents: 100,
          stock: 1,
          brand: 'ACME',
          sku: 'LATER-001',
          weight: 1,
        })
        .returning({ id: products.id });

      expect(inserted?.id).toBe(highestId + 1);
    });
  });

  describe('price conversion', () => {
    it('stores exact cents for prices that are inexact in floating point', async () => {
      database = await createTestDatabase();
      const file = writeDataset('prices.json', [
        makeProduct({ id: 1, sku: 'PRC-001', price: 19.99 }),
        makeProduct({ id: 2, sku: 'PRC-002', price: 0.29 }),
        makeProduct({ id: 3, sku: 'PRC-003', price: 4.35 }),
      ]);

      await seed(file);

      expect((await rows()).map((row) => row.priceCents)).toEqual([1999, 29, 435]);
    });
  });

  describe('an invalid dataset', () => {
    it('is rejected before any insertion, naming the item and field', async () => {
      database = await createTestDatabase();
      const file = writeDataset('invalid-stock.json', [
        makeProduct({ id: 1, sku: 'INV-001' }),
        makeProduct({ id: 2, sku: 'INV-002', stock: -1 }),
      ]);

      const attempt = seed(file);

      await expect(attempt).rejects.toBeInstanceOf(SeedError);
      await expect(attempt).rejects.toThrow('products[1].stock');
      expect(await rows()).toHaveLength(0);
    });

    it('is rejected when it is empty', async () => {
      database = await createTestDatabase();
      const file = writeDataset('empty.json', []);

      await expect(seed(file)).rejects.toThrow('at least one product');
    });

    it('rolls everything back when two products share a sku', async () => {
      database = await createTestDatabase();
      const file = writeDataset('duplicate-sku.json', [
        makeProduct({ id: 1, sku: 'DUP-001' }),
        makeProduct({ id: 2, sku: 'DUP-001' }),
      ]);

      await expect(seed(file)).rejects.toThrow('nothing was inserted');
      expect(await rows()).toHaveLength(0);
    });

    it('rolls everything back when two products share an id', async () => {
      database = await createTestDatabase();
      const file = writeDataset('duplicate-id.json', [
        makeProduct({ id: 1, sku: 'DID-001' }),
        makeProduct({ id: 1, sku: 'DID-002' }),
      ]);

      await expect(seed(file)).rejects.toThrow('nothing was inserted');
      expect(await rows()).toHaveLength(0);
    });

    it('reports malformed JSON with the file path', async () => {
      database = await createTestDatabase();
      const file = writeDataset('malformed.json', '[ { "id": 1, ');

      const attempt = seed(file);

      await expect(attempt).rejects.toBeInstanceOf(SeedError);
      await expect(attempt).rejects.toThrow(file);
      await expect(attempt).rejects.toThrow('not valid JSON');
      expect(await rows()).toHaveLength(0);
    });

    it('reports a missing file with its path', async () => {
      database = await createTestDatabase();
      const file = join(directory, 'does-not-exist.json');

      await expect(seed(file)).rejects.toThrow(`Cannot read the seed dataset ${file}`);
    });
  });
});
