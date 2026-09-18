import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  server: {
    // The SPA calls the API with relative paths; in development the API listens on port 3000.
    proxy: { '/api': 'http://localhost:3000' },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    // Lets tokens.test.ts read tokens.css; by default Vitest hands CSS imports back empty.
    css: { include: [/tokens\.css/] },
    setupFiles: ['./src/test/setup.ts'],
  },
});
