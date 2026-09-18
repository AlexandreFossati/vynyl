import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  // tsup externalizes everything listed in "dependencies" by default. The shared package
  // ships TypeScript source only, so it has to be bundled; other dependencies stay external.
  noExternal: ['@vynyl/shared'],
});
