import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPaths } from './paths';

const sourceEntry = new URL('../server.ts', import.meta.url).href;
const bundleEntry = new URL('../../dist/server.js', import.meta.url).href;

describe('getPaths', () => {
  it('finds the repository root from the source entry point', () => {
    const { repoRoot } = getPaths(sourceEntry);

    const rootPackage = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as {
      name: string;
    };
    expect(rootPackage.name).toBe('vynyl');
  });

  it('resolves the same paths from the bundled entry point', () => {
    expect(getPaths(bundleEntry)).toEqual(getPaths(sourceEntry));
  });

  it('points to existing migrations and dataset', () => {
    const { migrationsDir, datasetFile } = getPaths(sourceEntry);

    expect(existsSync(join(migrationsDir, 'meta', '_journal.json'))).toBe(true);
    expect(existsSync(datasetFile)).toBe(true);
  });

  it('places the optional .env file at the repository root', () => {
    const { repoRoot, envFile } = getPaths(sourceEntry);

    expect(envFile).toBe(join(repoRoot, '.env'));
  });

  it('returns a root without a trailing separator', () => {
    const { repoRoot } = getPaths(sourceEntry);

    expect(repoRoot.endsWith('/') || repoRoot.endsWith('\\')).toBe(false);
  });
});
