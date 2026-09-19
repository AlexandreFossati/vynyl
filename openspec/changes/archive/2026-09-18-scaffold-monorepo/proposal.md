# Proposal

## Why

The repository contains only planning documents. All the following tasks (API, SPA, tests, `npm start`) depend on a common base: an installable monorepo, validated tooling, a database with a versioned schema and the data set that feeds the application. Fixing this first, **with no application logic**, allows reviewing the structure in an isolated commit (T1 of `OPENSPEC_TASKS.md`) before building on top of it, and detecting early installation problems on Windows (`@libsql/client`, Cypress) and incompatibilities between package versions.

## What Changes

- Create the monorepo with npm workspaces: `apps/api`, `apps/web` and `packages/shared`, with cross-platform root scripts (`lint`, `typecheck`, `test`, `format`, `build`, `dev`).
- Pin the runtime (`.nvmrc` + `engines`) and configure strict TypeScript, ESLint and Prettier in a single configuration at the root.
- Create the folder skeleton of each package per section 3 of the guide (API layers and Atomic Design levels), with minimal placeholder files and no logic.
- Create a minimal `App.svelte` that only renders the title, to prove the frontend toolchain works.
- Configure Vitest (api, web and shared), Testing Library in web and Cypress (`cypress.config.ts`, no specs).
- Install the dependencies already decided in the guide, closing the `package-lock.json`, and validate the installation on Windows.
- Define the Drizzle schema of the `products` table (with constraints and index) and generate/version the initial migration in `apps/api/drizzle/`, with the `db:generate` script.
- Create the `data/products.json` data set (40+ products) in the PDF template's format.
- Create `.gitignore` and `.env.example`.

**Out of scope** (T2 onward): Express app, handlers, Zod schemas, seed, config/logger, components, design tokens, CI and final README. No product behavior change is introduced.

## Capabilities

### New Capabilities

- `monorepo-workspace`: repository structure, workspace packages, root scripts, runtime version, static checks (lint, types, tests) and ignored/versioned file rules.
- `product-database-schema`: structure of the `products` table, its integrity constraints and index, and the versioned migration that creates it.
- `product-dataset`: contract of the initial product data set (`data/products.json`) that will be loaded by the application.

### Modified Capabilities

<!-- None: openspec/specs/ is empty, there are no existing capabilities. -->

## Impact

- **Code**: no application code. Only configuration, placeholders, the Drizzle schema (`apps/api/src/db/schema.ts`), the generated SQL migration and the data JSON.
- **Dependencies**: all those decided in section 2 of the guide (Express 5, Drizzle ORM/Kit, `@libsql/client`, Zod, pino, pino-http, express-rate-limit, Svelte 5, Vite, Vitest, Testing Library, Cypress, ESLint, Prettier, TypeScript etc.), plus `tsup` (API bundle), `tsx` (development execution) and `concurrently` (root `dev` script). Versions and compatibility constraints are in `design.md`.
- **Risks that motivate the order**: the `latest` of some packages is incompatible with the rest of the tooling (e.g. TypeScript 7 is not accepted by `typescript-eslint` or `svelte-check`); downloading the Cypress binary weighs on `npm install`; and `better-sqlite3` v13 tries to compile via `node-gyp` when installing from the lockfile, which motivated the use of `@libsql/client` (see `design.md`, D16).
- **Documentation**: progress is reflected in `OPENSPEC_TASKS.md`; no decision in `PROJECT_GUIDE.md` is changed by this change, only detailed in `design.md`.
