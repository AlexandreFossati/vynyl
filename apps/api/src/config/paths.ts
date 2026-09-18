import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface Paths {
  repoRoot: string;
  envFile: string;
  migrationsDir: string;
  datasetFile: string;
}

// Paths come from where the code lives, never from the working directory. The entry point is
// apps/api/src/server.ts in development and apps/api/dist/server.js once bundled: both are
// three levels below the repository root.
export function getPaths(entryUrl: string): Paths {
  const repoRoot = resolve(fileURLToPath(new URL('../../../', entryUrl)));

  return {
    repoRoot,
    envFile: join(repoRoot, '.env'),
    migrationsDir: join(repoRoot, 'apps', 'api', 'drizzle'),
    datasetFile: join(repoRoot, 'data', 'products.json'),
  };
}
