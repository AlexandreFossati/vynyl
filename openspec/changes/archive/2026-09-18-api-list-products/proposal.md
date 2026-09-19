# Proposal

## Why

The repository has the skeleton (T1), but no backend logic. T2 delivers the **first end-to-end endpoint** (`GET /api/products`, with pagination and search) together with the whole foundation it requires: configuration, logs, database, migrations, seed, layers, validation and error handling. Since it is the backend model task (`OPENSPEC_TASKS.md`), what is decided and approved here becomes the pattern that T3 (remaining endpoints) and T4 replicate. That is why the user's review is a checkpoint: correcting a pattern now costs little, correcting it after it has been replicated costs a lot.

## What Changes

- **`packages/shared`**: product schema (used in the response and to validate the data set in the seed), list query schema (`limit`, `offset`, `q`), paginated response type/schema `{ data, total, limit, offset }`, error codes and error envelope schema, limit constants.
- **API foundation** (`apps/api/src`):
  - configuration via validated environment variables, with fail fast at boot and optional `.env`;
  - `pino` logger and per-request log (`pino-http`) with `X-Request-Id` and no sensitive data;
  - `@libsql/client` client via `drizzle-orm/libsql`, migrations applied at start and idempotent seed of `data/products.json`;
  - `routes → handlers → services → repositories` layers and `mappers` (one file per layer), with dependency injection by parameter;
  - `validate` middlewares, central error handling (`AppError`) and 404 for a nonexistent route;
  - `createApp(deps)` and the bootstrap in `server.ts`.
- **Endpoint** `GET /api/products`: 30 items by default, `limit` 1–100, `offset`, `q` search by case-insensitive substring in title and description, ordering by ascending `id`.
- **Tests** (Vitest): unit tests per layer, repository against in-memory SQLite with the migrations, routes via Supertest, invalid configuration and idempotent seed.
- Removal of the `.gitkeep` files from folders that now have files.

**Out of scope**: remaining endpoints (T3), JSON body parser (comes in with the first `POST`, T3), rate limit, `/health`, graceful shutdown and singleflight (T4), frontend and serving the SPA (T5 to T7), sorting and categories (T9).

## Capabilities

### New Capabilities

- `product-listing-api`: HTTP contract of `GET /api/products`: response format, product representation, pagination, parameter validation and search.
- `api-error-handling`: standardized error envelope, codes and statuses, nonexistent route and unexpected errors with no leak of details.
- `api-configuration`: supported environment variables, default values, fail fast with invalid configuration, optional `.env` and database path resolution.
- `catalog-bootstrap`: migrations and initial seed applied automatically at startup, idempotently and atomically.
- `api-request-logging`: request identifier, structured log per request and absence of sensitive data in the logs.

### Modified Capabilities

<!-- None: the requirements of the existing capabilities (monorepo-workspace, product-database-schema, product-dataset) do not change. -->

## Impact

- **Code**: `packages/shared/src` (new modules and tests) and `apps/api/src` (config, db, lib, middleware, mappers, repositories, services, handlers, routes, `app.ts`, `server.ts` and tests). No change to the database schema or the migrations.
- **Dependencies**: none new. The ones already installed in T1 start being used: `express`, `zod`, `pino`, `pino-http`, `@libsql/client`, `drizzle-orm`, `supertest`.
- **Observable behavior**: the API starts listening on `PORT` (default 3000), creates `data/app.db` (ignored by git) and responds to `GET /api/products`.
- **Documentation**: T2's progress is reflected in `OPENSPEC_TASKS.md`; the "Approved patterns" section is filled in by the user after the review. No decision in `PROJECT_GUIDE.md` is changed; `design.md` records the few detail choices (e.g. a single product schema, validation in `res.locals`).
- **Risks**: as it is a model task, the biggest risk is consolidating a bad pattern. `design.md` explicitly lists the points that deserve attention in the review.
