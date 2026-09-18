import type { Client } from '@libsql/client';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { createDatabase, toDatabaseUrl } from './client';

const scalar = async (client: Client, pragma: string): Promise<unknown> => {
  const result = await client.execute(`PRAGMA ${pragma}`);
  return Object.values(result.rows[0] ?? {})[0];
};

describe('toDatabaseUrl', () => {
  const repoRoot = resolve(tmpdir(), 'some repo');

  it('passes :memory: through untouched', () => {
    expect(toDatabaseUrl(':memory:', repoRoot)).toBe(':memory:');
  });

  it('resolves a relative path against the repository root', () => {
    expect(toDatabaseUrl('./data/app.db', repoRoot)).toBe(
      pathToFileURL(join(repoRoot, 'data', 'app.db')).href,
    );
  });

  it('respects an absolute path', () => {
    const absolute = resolve(tmpdir(), 'elsewhere', 'other.db');

    expect(toDatabaseUrl(absolute, repoRoot)).toBe(pathToFileURL(absolute).href);
  });

  it('produces a URL that maps back to the same path, even with spaces', () => {
    const url = toDatabaseUrl('data/my db.db', repoRoot);

    expect(url.startsWith('file:')).toBe(true);
    expect(fileURLToPath(url)).toBe(join(repoRoot, 'data', 'my db.db'));
  });
});

describe('createDatabase', () => {
  const opened: Client[] = [];
  const directories: string[] = [];

  const tempRoot = (): string => {
    const directory = mkdtempSync(join(tmpdir(), 'vynyl-db-'));
    directories.push(directory);
    return directory;
  };

  afterEach(() => {
    for (const client of opened.splice(0)) {
      client.close();
    }
    for (const directory of directories.splice(0)) {
      try {
        rmSync(directory, { recursive: true, force: true });
      } catch {
        // On Windows libsql keeps the file handle after close() until the process exits, so
        // the directory cannot be removed here. It lives in the OS temp folder; ignoring is safe.
      }
    }
  });

  it('creates the missing parent directory of a database file', async () => {
    const repoRoot = tempRoot();

    const { client } = await createDatabase({
      databasePath: './nested/deeper/app.db',
      repoRoot,
    });
    opened.push(client);
    await client.execute('CREATE TABLE t (x INTEGER)');

    expect(existsSync(join(repoRoot, 'nested', 'deeper', 'app.db'))).toBe(true);
  });

  it('configures a file database with WAL, foreign keys and a busy timeout', async () => {
    const { client } = await createDatabase({ databasePath: 'app.db', repoRoot: tempRoot() });
    opened.push(client);

    expect(await scalar(client, 'journal_mode')).toBe('wal');
    expect(await scalar(client, 'foreign_keys')).toBe(1);
    expect(await scalar(client, 'busy_timeout')).toBe(5000);
  });

  it('opens an in-memory database with foreign keys enabled', async () => {
    const { client } = await createDatabase({ databasePath: ':memory:', repoRoot: tempRoot() });
    opened.push(client);

    expect(await scalar(client, 'foreign_keys')).toBe(1);
    expect(await scalar(client, 'journal_mode')).toBe('memory');
  });
});
