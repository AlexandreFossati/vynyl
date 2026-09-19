# Design

## Context

Repository with only documentation (`PROJECT_GUIDE.md`, `OPENSPEC_TASKS.md`, `CLAUDE.md`, `DELIVERABLES.md`, a one-line `README.md` and `openspec/`). There is no `package.json`, code or `.gitignore`. Development on **Windows 11**, Node **v24.21.0**, npm **11.19.0**. Motivation and scope: see `proposal.md`; verifiable requirements: see `specs/`.

Facts gathered in the research (queries to the npm registry and to `nodejs.org` on 2026-09-18) that condition the decisions:

- **Node 24 is LTS** (Krypton, 24.21.0). Node 22 (Jod) is in maintenance LTS; Node 26 is the "Current" line.
- The `latest` of several packages is recent: TypeScript **7.0.2**, Vite **8.3**, Vitest **5.0.1**, ESLint **10.10**, `better-sqlite3` **13.0.3**, `@libsql/client` **0.18.0**, Zod **4.6.5**, Cypress **16.1**, Express **5.2.1**, drizzle-orm **0.45.2**, drizzle-kit **0.31.10**, Svelte **5.57**.
- **Real incompatibility**: `typescript-eslint@8.70` requires `typescript <6.1.0` and `svelte-check@4.7` accepts only TypeScript `^5 || ^6`. So TypeScript 7 (`latest`) **cannot be used**; the last 6.x version is **6.0.3**.
- Compatible with the rest: `@sveltejs/vite-plugin-svelte@7.3` requires `vite ^8`; `vitest@5` accepts `vite ^6.4 || ^7 || ^8`; `typescript-eslint` and `eslint-plugin-svelte` accept ESLint 10; Cypress 16 requires Node `^22 || ^24 || >=26`.
- **Finding during implementation (task 3.1)**: `better-sqlite3@13` installs fine on a from-scratch installation, but **fails to install from the lockfile** (it tries `node-gyp rebuild`). This did not show up in the initial research, which only tested installation without a lockfile. Decision D16: use `@libsql/client`.

## Goals / Non-Goals

**Goals:**
- An installable base with a single `npm install`, with tooling validated end to end (lint, types, tests, build, dev) **before** any application code exists.
- Resolve here the structural decisions that affect all the following tasks: consumption model of the `shared` package, module system, API build and compatible versions.
- Database and data set ready and verified independently of the application code.

**Non-Goals:**
- Any application logic, Zod schemas, seed, config/logger, components or tokens (T2 onward).
- CI, Docker, final `README.md`, `npm start` and `test:e2e` (T7/T8).
- Type-aware linting and extra style rules (may be evaluated after the T2 review).

## Decisions

### D1. Runtime: Node 24 in `.nvmrc`, `engines` accepts 22.22.2+ and 24.15+
`.nvmrc` = `24`. `engines.node` = `^22.22.2 || ^24.15.0`, which is the real intersection of the dependencies' `engines`. Correction made during implementation (task 3.1): the strictest limit comes from `jsdom@30` (`^22.22.2 || ^24.15.0`); ESLint 10 requires `^22.13`, Vite 8 and Vitest 5 require `^22.12`. The initial version of this design (`^22.12.0 || ^24.0.0`) would accept versions where the web tests do not run. **Alternatives**: pin only `^24` (stricter, but blocks evaluators on Node 22 for no technical reason, since `engines` only emits a warning); use Node 26 (it is "Current", not LTS). The environment is validated only on Node 24; Node 22 is declared by the dependencies but not exercised (see Risks).

### D2. Versions: compatible `latest`, except TypeScript `~6.0.3`
Use `^` ranges resolved to the compatible `latest` and pinned by `package-lock.json`, with two deliberate exceptions: **TypeScript `~6.0.3`** (limit of the `typescript-eslint` and `svelte-check` peers) and **`@types/node` `^24`** (aligned with the runtime, rather than the `latest` 26). Before installing, confirm peers; if `ERESOLVE` appears, **do not** use `--force` or `--legacy-peer-deps`: adjust the version. **Alternative**: pin everything to exact versions (more reproducible, but the lockfile already guarantees that). TS 6.0 may have different defaults from 5.x (e.g. `types`); that is why the `tsconfig`s explicitly declare `types`, `module`, `moduleResolution` and `target`.

### D3. `@vynyl/shared` as an internal "source-only" package
`packages/shared/package.json` exports `./src/index.ts` directly (`"exports": { ".": "./src/index.ts" }`), **with no build step**. Consumers: Vite (web), Vitest (all), `tsx` (API in development) and `tsup` (API build). Type checking with `tsc --noEmit`. `api` and `web` declare it as a dependency `"@vynyl/shared": "*"`.
- **API build**: `tsup` bundles `src/server.ts` into `apps/api/dist/server.js` (ESM, Node 22 target). Since `tsup` **externalizes by default everything in `dependencies`**, `@vynyl/shared` **must** be in `noExternal`; the other dependencies stay external. `npm start` (T7) will run `node apps/api/dist/server.js`. This resolves item 5 of section 15 of the guide.
- **Alternatives**: (a) `tsc -b` with project references and `dist` in `shared`: requires recompiling before each typecheck/test/dev, with more friction; (b) conditional exports (`types` → src, `default` → dist): same prior-build problem to run; (c) run the API with `tsx` in production too: dispenses with a build, but executes TypeScript at runtime, which weakens the "production ready" argument.
- **Trade-off**: every consumer needs to understand TypeScript. That is true here (Vite, Vitest, tsx and tsup do).

### D4. ESM across the whole repository, `Bundler` resolution
All packages with `"type": "module"`; TypeScript with `module: ESNext` and `moduleResolution: Bundler`, no extensions in relative imports and with `verbatimModuleSyntax`. **Alternative**: `NodeNext` (would force `.js` in all imports and brings no benefit, since nothing runs `tsc`'s output directly: the API runs via `tsx` or the bundle).

### D5. TypeScript: strict `tsconfig.base.json` + one `tsconfig` per package
Base: `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `isolatedModules`, `verbatimModuleSyntax`, `skipLibCheck`, `target ES2023`, `noEmit`. Each package extends the base and adjusts `lib`/`types` (web uses `DOM` and the Svelte/Vite types; api and shared use `node`). `exactOptionalPropertyTypes` is left out due to friction with libs. The web does **not** use `@tsconfig/svelte` (avoids a dependency for a few lines). The web needs **`allowJs: true`** in its `tsconfig`: without it `svelte-check` reports TS7016 ("Could not find a declaration file for module ./App.svelte"), because it resolves `.svelte` imports in a way that TypeScript treats as a JS module (discovered in task 3.2; the `tsconfig` generated by SvelteKit also enables it). It does not enable `checkJs`, so no JS starts being checked.

### D6. Single ESLint 10 (flat config) at the root, not type-aware for now
`eslint.config.js` combines: `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-plugin-svelte` (with the TS parser in `<script lang="ts">`), `globals` (node for api/shared/configs, browser for web) and `eslint-config-prettier` last. `no-console: error` in `src/` (aligns with the Definition of Done and the use of pino). Ignores `dist`, `node_modules`, `apps/api/drizzle`, `coverage`, Cypress artifacts. **Alternative**: `recommendedTypeChecked` (catches `no-floating-promises`, useful with Express), but it is slower and complicates the configuration with Svelte; it stays as a candidate for review after T2.

### D7. Prettier: simple style, with generated/planning files ignored
`singleQuote`, `semi`, `trailingComma: all`, `printWidth: 100`, `prettier-plugin-svelte`. `.prettierignore`: `node_modules`, `dist`, `coverage`, `package-lock.json`, `apps/api/drizzle`, `openspec`, `.claude` and `*.md` (avoids reformatting the planning documents, which will be translated in their own commit). `data/products.json` **is** formatted.

### D8. Scripts (all cross-platform, no shell syntax)
- **Root**: `lint` = `eslint .`; `typecheck`/`test`/`build` = `npm run <x> --workspaces --if-present`; `format` = `prettier --write .`; `dev` = `concurrently` running the `dev` of api and web. The order in `workspaces` is `shared`, `api`, `web`.
- **api**: `dev` = `tsx watch src/server.ts`; `build` = `tsup`; `typecheck` = `tsc --noEmit`; `test` = `vitest run --passWithNoTests`; `db:generate` = `drizzle-kit generate` (the name of the first migration is passed only once at generation: `-- --name init_products`).
- **web**: `dev` = `vite`; `build` = `vite build`; `typecheck` = `svelte-check --tsconfig ./tsconfig.json`; `test` = `vitest run --passWithNoTests`.
- **shared**: `typecheck` and `test`.
- Not here: `start` and `test:e2e` (T7). **Alternative** to `concurrently` in `dev`: `npm-run-all2` (requires Node `^22.22 || ^24.15`, stricter) or manual scripts in two terminals (worse DX).

### D9. Vitest: `node` in the API and shared, `jsdom` in the web
- **api/shared**: `environment: 'node'`, `include: ['src/**/*.test.ts']`.
- **web**: configuration inside `vite.config.ts` (`test` block), `environment: 'jsdom'`, the Svelte plugin + `svelteTesting()` from `@testing-library/svelte/vite`, `setupFiles` with `@testing-library/jest-dom/vitest`.
- Since there are no tests in T1, the configuration is validated with a **throwaway test** (renders `App.svelte`), run and removed before closing the task. **Alternative**: keep a permanent smoke test; discarded for contradicting "no tests yet" and for adding code that is not part of the task.

### D10. Placeholder SPA
`index.html`, `src/main.ts` (mounts the component with the Svelte 5 API), `src/App.svelte` (an `<h1>` with the title) and `src/vite-env.d.ts`. No `svelte.config.js` unless verification requires it (Svelte 5 accepts TypeScript with only types in `<script lang="ts">`). Cypress: `apps/web/cypress.config.ts` with `baseUrl` `http://localhost:3000` (the guide's default, overridable by variable), `cypress/e2e/.gitkeep` and `cypress/tsconfig.json`; no specs.

### D11. Database schema (`apps/api/src/db/schema.ts`) with defense in depth
`products` table per section 5 of the guide, and in addition **CHECK constraints** for `price_cents >= 0`, `stock >= 0` and `weight > 0`, index `products_category_idx` on `category`, `sku` with `UNIQUE`, and `created_at`/`updated_at` with **default** `strftime('%Y-%m-%dT%H:%M:%fZ','now')` (the template's format: ISO 8601 UTC with milliseconds and `Z`). The database is the last line of defense even if the validation layer fails. **Alternative**: only `NOT NULL`/`UNIQUE`, delegating limits to the application; discarded as less robust and cheap to avoid. `updated_at` has **no** trigger: the application updates it on PATCH (T3).
- `drizzle.config.ts`: dialect `sqlite`, schema at `./src/db/schema.ts`, output `./drizzle`. `drizzle-kit generate` does not need a database connection.
- First migration generated with `--name init_products` → `apps/api/drizzle/0000_init_products.sql` plus the `meta/` folder (journal and snapshot), all versioned, since the runtime migrator (T2) depends on them.

### D12. Data set: 44 fictional products in English
`data/products.json` with **44 products**, 6 categories (`automotive`, `dimensional-travel`, `energy`, `tools`, `communication`, `safety`), fictional brands (ACME and 3 others), SKUs `<BRAND>-<FAMILY>-<NNN>`, sequential IDs 1..44. Items 1 and 2 reproduce **exactly** those from the PDF (description without the PDF's line-continuation backslashes). Prices with 2 places, weights with up to 2 places, at least one `stock` 0, `updatedAt >= createdAt`. Terms such as "flux", "dimensional" and "capacitor" repeat across items to make search demonstrable. No text contains `%` or `_` (T2's `LIKE` escape tests use their own fixtures). The file is written by hand and validated by a **throwaway** script (not versioned). **Alternative**: generate with a versioned script; discarded, since it would be code outside the scope and the data is static.

### D13. `.gitignore` and `.env.example`
`.gitignore`: `node_modules`, `dist`, `coverage`, `.env`, `data/*.db`, `data/*.db-wal`, `data/*.db-shm`, `apps/web/cypress/screenshots`, `apps/web/cypress/videos`, `*.tsbuildinfo`, `*.log`, `.vite`, OS files. It does **not** ignore `.env.example` or `data/products.json`. `.env.example` lists only variables that T2 will consume: `NODE_ENV`, `PORT` (3000), `DATABASE_PATH` (`./data/app.db`) and `LOG_LEVEL` (info); the rate limit ones come in with T4 (do not document variables that nothing reads).

### D14. Where each dependency goes
- **Root (dev)**: `typescript`, `@types/node`, `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-svelte`, `eslint-config-prettier`, `globals`, `prettier`, `prettier-plugin-svelte`, `concurrently`.
- **shared**: dep `zod`; dev `vitest`.
- **api**: deps `express`, `drizzle-orm`, `@libsql/client`, `zod`, `pino`, `pino-http`, `express-rate-limit`, `@vynyl/shared`; dev `drizzle-kit`, `tsx`, `tsup`, `vitest`, `supertest`, `@types/express`, `@types/supertest`.
- **web**: deps `svelte`, `@vynyl/shared`; dev `vite`, `@sveltejs/vite-plugin-svelte`, `svelte-check`, `vitest`, `jsdom`, `@testing-library/svelte`, `@testing-library/jest-dom`, `cypress`.
- All justified by the guide (section 2), except `tsup`, `tsx`, `concurrently` and `globals` (D3, D8, D6). An SPA router and other UI libs do **not** come in (T5).

### D15. Verification strategy (what "done" means)
1. **Simulated clean clone**: copy the working tree, without `node_modules`, `dist` and databases, to the temporary folder and run `npm install` in it (the agent does not commit, so a real `git clone` does not contain the changes).
2. Run `npm run lint`, `typecheck`, `test`, `build` and `format` (idempotent) and check exit code 0.
3. **`shared` wiring proof** (temporary, reverted): import `@vynyl/shared` from the API (`tsx`, `tsup` with bundle, Vitest) and from the web (Vite, Vitest, `svelte-check`).
4. **Throwaway web test** (D9) to prove Vitest + jsdom + Testing Library + Svelte 5.
5. **Migration**: apply `0000_init_products.sql` to a temporary SQLite and probe each requirement of the `product-database-schema` spec (uniqueness, CHECKs, index via `pragma index_list`, timestamp default); run `db:generate` again and confirm "no changes".
6. **Data set**: a throwaway script verifies each requirement of the `product-dataset` spec.
7. **Dev**: start the web `dev`, request the page over HTTP, confirm the title and end the process.
8. Honestly record what it was **not** possible to verify (e.g. Linux/macOS, Node 22).

### D16. SQLite driver: `@libsql/client` instead of `better-sqlite3`
Decision by the user after the task 3.1 finding. **Problem**: `better-sqlite3@13` contains a `binding.gyp` and declares `gypfile: false` to avoid compilation, but npm **ignores** that field when installing from `package-lock.json` (the lockfile does not record it) and runs `node-gyp rebuild`, which fails without Python and a C++ toolchain. Reproduced with a lockfile generated by a normal installation and `npm ci` in a folder containing only `package.json` + lockfile: **fails**; `better-sqlite3@12.11.1` (uses `prebuild-install`) and `@libsql/client@0.18.0` **install**, even with the npm cache empty.
- **Decision**: `@libsql/client` with `drizzle-orm/libsql`: no `node-gyp`, no binary downloads from GitHub (they come via per-platform npm packages) and no `prebuild-install` (which warns it is no longer maintained).
- **Alternatives**: `better-sqlite3@12` (minimal change, but depends on the download from GitHub Releases and on an unmaintained package); `--ignore-scripts` in `.npmrc` (avoids compilation, but also turns off the Cypress binary download).
- **Consequences**: (a) **asynchronous** data access (repositories return Promises, from T2); (b) the client receives a **URL** (`file:./data/app.db`, `:memory:` in tests), so T2 converts `DATABASE_PATH`; (c) the SQLite embedded in libsql is 3.45.1 (better-sqlite3 v13's is 3.53), enough for CHECK, indexes, `strftime` and WAL; (d) **singleflight still has no real effect**: measured in the scratchpad, 5 requests in distinct event-loop tasks ran the query 5 times (0 coalesced), since the query runs on the main thread; only calls in the same tick coalesce (see `PROJECT_GUIDE.md`, section 11.3).

## Risks / Trade-offs

- **Very new versions diverge in peers** (e.g. TypeScript 7) → pin TS `~6.0.3`, check peers before installing, forbid `--force`/`--legacy-peer-deps`, and the lockfile reproduces the result.
- **TypeScript 6 defaults different from 5.x** → explicit `tsconfig`s (`types`, `module`, `moduleResolution`, `target`); validate on the first `typecheck`.
- **Vitest 5 + Vite 8 + Testing Library + Svelte 5 with no prior use in this project** → throwaway test (D9/D15) before considering the task complete.
- **Node 22 declared but not exercised** → mention in the report and in the README (T8); `engines` only warns, does not block.
- **Weight of `npm install` because of the Cypress binary** (downloaded in post-install) → measure time/size in verification; document in the README (T8) the `CYPRESS_INSTALL_BINARY=0` alternative for those who only want to run the application and `npx cypress install` afterwards for e2e.
- **`tsup` externalizes `dependencies` by default** → explicit `noExternal: ['@vynyl/shared']`; verify that `dist/server.js` contains no `@vynyl/shared` imports.
- **`tsup` is not the recommended successor** (there is `tsdown`, newer and still 0.x) → `tsup` is not discontinued and only bundles; swappable later with no impact.
- **Validation only on Windows** → scripts with no shell syntax reduce the risk; Linux/macOS declared as not verified.
- **`npm test` runs workspaces in sequence** → acceptable at this scale; no parallelization.
- **Placeholders (`export {}`) and `.gitkeep`** → contain no logic; must be replaced by the following tasks.
- **Installation from the lockfile is only truly validated with `npm ci`** (the `better-sqlite3` v13 failure did not show up on a from-scratch installation) → verification 7.1 uses `npm ci` with an empty npm cache and checks that nothing is compiled.
- **A lockfile generated over an existing `node_modules` may omit the optional binaries of other platforms** (observed in the scratchpad) → the lockfile is generated from scratch (without `node_modules` and without a prior lockfile), and the Linux and macOS entries are checked.
- **`@libsql/client` also brings remote-access code (`@libsql/hrana-client`)** → only local mode (`file:` / `:memory:`) is used; the extra size is accepted.

## Open Questions

- **Resolution of a relative `DATABASE_PATH`** (relative to the cwd or to the repository root) and the location of the `drizzle/` folder at runtime when the API is bundled: T2/T7 decisions; `.env.example` already uses `./data/app.db`; `@libsql/client` receives a `file:` URL, and converting the path to a URL is done in T2.
- **Cypress `baseUrl`** and how to bring the server up in `test:e2e`: decided in T7; T1 only defines the default `http://localhost:3000`.
