import { afterEach, describe, expect, it } from 'vitest';
import { getPaths } from '../config/paths';
import { createDatabase } from './client';
import { runMigrations } from './migrate';
import { products } from './schema';

const paths = getPaths(new URL('../server.ts', import.meta.url).href);

describe('runMigrations', () => {
  const closers: Array<() => void> = [];

  afterEach(() => {
    for (const close of closers.splice(0)) {
      close();
    }
  });

  const openEmptyDatabase = async () => {
    const database = await createDatabase({ databasePath: ':memory:', repoRoot: paths.repoRoot });
    closers.push(() => database.client.close());
    return database;
  };

  it('creates the products table in a new database', async () => {
    const { client, db } = await openEmptyDatabase();

    await runMigrations(db, paths.migrationsDir);

    const tables = await client.execute(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'products'",
    );
    expect(tables.rows).toHaveLength(1);
  });

  it('is safe to run again and keeps the existing data', async () => {
    const { db } = await openEmptyDatabase();
    await runMigrations(db, paths.migrationsDir);
    await db.insert(products).values({
      title: 'Kept',
      description: 'Still here after a second run',
      category: 'tools',
      priceCents: 100,
      stock: 1,
      brand: 'ACME',
      sku: 'KEEP-001',
      weight: 1,
    });

    await runMigrations(db, paths.migrationsDir);

    const rows = await db.select().from(products);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.title).toBe('Kept');
  });
});
