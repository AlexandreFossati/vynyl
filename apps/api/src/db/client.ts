import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import * as schema from './schema';

export type Db = LibSQLDatabase<typeof schema>;

export const IN_MEMORY = ':memory:';
const BUSY_TIMEOUT_MS = 5000;

// A relative path is resolved against the repository root (not the working directory), an
// absolute path is respected, and ":memory:" is passed through untouched.
export function toDatabaseUrl(databasePath: string, repoRoot: string): string {
  if (databasePath === IN_MEMORY) {
    return IN_MEMORY;
  }
  return pathToFileURL(resolve(repoRoot, databasePath)).href;
}

export async function createDatabase(options: {
  databasePath: string;
  repoRoot: string;
}): Promise<{ client: Client; db: Db }> {
  const { databasePath, repoRoot } = options;
  const inMemory = databasePath === IN_MEMORY;

  if (!inMemory) {
    mkdirSync(dirname(resolve(repoRoot, databasePath)), { recursive: true });
  }

  const client = createClient({ url: toDatabaseUrl(databasePath, repoRoot) });
  await client.execute('PRAGMA foreign_keys = ON');
  await client.execute(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);
  if (!inMemory) {
    // WAL only applies to file databases; an in-memory database reports "memory".
    await client.execute('PRAGMA journal_mode = WAL');
  }

  return { client, db: drizzle({ client, schema }) };
}
