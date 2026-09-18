import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    'apps/api/drizzle/**',
    'apps/web/cypress/screenshots/**',
    'apps/web/cypress/videos/**',
    'openspec/**',
    '.claude/**',
  ]),

  js.configs.recommended,
  tseslint.configs.recommended,
  svelte.configs.recommended,

  // An underscore prefix marks a deliberately unused parameter. Express identifies error
  // handlers by their four parameters, so `_next` has to be declared even when it is not used.
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // Parse TypeScript inside <script lang="ts"> blocks.
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },

  // Node runtime: API, shared package and tooling configuration files.
  {
    files: ['apps/api/**/*.{ts,js}', 'packages/shared/**/*.ts', '*.{js,ts}', '**/*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },

  // Browser runtime: SPA sources.
  {
    files: ['apps/web/src/**/*.{ts,svelte}'],
    languageOptions: { globals: globals.browser },
  },

  // Application code logs through the structured logger, never the console.
  {
    files: ['apps/*/src/**/*.{ts,svelte}', 'packages/*/src/**/*.ts'],
    rules: { 'no-console': 'error' },
  },

  // Formatting is Prettier's job: keep these last so they disable conflicting rules.
  prettier,
  svelte.configs.prettier,
]);
