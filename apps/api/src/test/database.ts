import type { Client } from '@libsql/client';
import { getPaths } from '../config/paths';
import { createDatabase, type Db } from '../db/client';
import { runMigrations } from '../db/migrate';

const paths = getPaths(new URL('../server.ts', import.meta.url).href);

export interface TestDatabase {
  client: Client;
  db: Db;
  close: () => void;
}

// Test helper: an empty in-memory database with the real migrations applied.
export async function createTestDatabase(): Promise<TestDatabase> {
  const { client, db } = await createDatabase({
    databasePath: ':memory:',
    repoRoot: paths.repoRoot,
  });
  await runMigrations(db, paths.migrationsDir);
  return { client, db, close: () => client.close() };
}
