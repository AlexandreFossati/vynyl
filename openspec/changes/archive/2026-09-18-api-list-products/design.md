# Design

## Context

State after T1 (commit `21f75b2`): monorepo with placeholder `apps/api/src/server.ts` and `packages/shared/src/index.ts`, `apps/api/src/db/schema.ts` (`products` table), migration `0000_init_products.sql`, `data/products.json` (44 products), Express 5, Drizzle + `@libsql/client`, pino, pino-http, Zod 4 and Supertest already installed. The layer folders exist with `.gitkeep`. Motivation and scope: see `proposal.md`; verifiable requirements: see `specs/`. General decisions: `PROJECT_GUIDE.md` (sections 4 to 8). The roadmap's "Approved patterns" section is empty: **this task creates the patterns**.

Facts verified in experiments in the scratchpad (Windows, Node 24.21, lockfile versions), which condition the decisions:

| Fact | Evidence | Consequence |
|---|---|---|
| In Express 5, `req.query` is **read-only** | assigning `req.query = {...}` throws `Cannot set property query ... which has only a getter` | the validation middleware cannot rewrite `req.query` |
| A repeated parameter becomes an array; the `a[b]=1` syntax does **not** become an object (simple query parser) | `?x=1&x=2` → `["1","2"]`; `?a[b]=1` → literal key `a[b]` | a schema with `string` already rejects repetition; no risk of nested objects |
| Rejection of an async handler reaches the error middleware | `async` handler with `throw` → 500 handled | no need for `try/catch` or a wrapper in the handlers |
| Malformed query string (`?q=%`) does not break Express | responds 200 with the raw text | no extra handling needed |
| libsql transaction on `:memory:` **keeps** the data | 4 rows visible after `db.transaction` | repository and seed tests can use `:memory:` |
| `PRAGMA journal_mode=WAL` on `:memory:` returns `memory` | `{"journal_mode":"memory"}` (on a file: `wal`) | WAL only applies to a file database |
| `LIKE ... ESCAPE '\'` with escaping of `\`, `%`, `_` works; it is case-insensitive **only for ASCII** | `q=alpha` finds `ALPHA`; `q=É` does not find `é`; `q=%` finds only the text with a literal `%` | limitation already documented in the guide; kept |
| `pino-http` with default serializers **leaks** the `Authorization` header | the log contained `TOPSECRET` | own serializers on an allowlist |
| `process.loadEnvFile` throws `ENOENT` if the file is missing and does **not** overwrite existing variables | tested | an optional `.env` is possible with no dependency (`dotenv`) |
| libsql accepts `pathToFileURL(absolutePath).href` (including with a space) and fails if the parent folder does not exist | tested | create the folder before opening |
| Zod's `multipleOf(0.01)` is floating-point safe | accepts `19.99`, `4.35`, `1.15`; rejects `1.005`, `9.999` | validates "up to 2 decimal places" with no hack |
| Imports `{ pinoHttp }`, `drizzle-orm/libsql`, the migrator and the query with `count()`/`sql` compile under the project's strict `tsconfig` | a sketch with `tsc --noEmit` passed | no type friction expected |

## Goals / Non-Goals

**Goals:**
- A complete, tested endpoint that serves as the pattern for the other routes: same layer structure, validation, errors, logs and tests.
- Operable foundation: start, migrate, seed and serve with `npm run dev -w @vynyl/api` and with the bundle (`node apps/api/dist/server.js`).
- Each layer testable in isolation (dependencies injected by parameter).

**Non-Goals:**
- JSON body parser (comes in with the first `POST`, T3), rate limit, `/health`, graceful shutdown and singleflight (T4), frontend and SPA serving.
- Configurable sorting, filter by category and cache.
- Authentication, `helmet`, CORS (scope decisions of the guide).

## Decisions

### D1. Structure, names and dependency injection
One file per layer and per resource, `kebab-case` with the layer suffix. Each layer is a **factory function** that receives its dependencies by parameter and returns an object/interface, with no module singletons. Only `server.ts` (composition root) reads the environment and creates real resources.

| File (`apps/api/src/`) | Role |
|---|---|
| `server.ts` | composition root: paths, `.env`, config, logger, database, migrations, seed, `listen` |
| `app.ts` | `createApp({ db, logger })`: wires middlewares and routes; composes repository → service → handler → router |
| `config/env.ts`, `config/paths.ts` | `loadConfig(env)` and `getPaths(import.meta.url)` |
| `lib/errors.ts`, `lib/logger.ts`, `lib/like.ts` | `AppError` + code→status map, `createLogger`, `escapeLikePattern` |
| `db/client.ts`, `db/migrate.ts`, `db/seed.ts` | `toDatabaseUrl`/`createDatabase`, `runMigrations`, `seedProducts` |
| `middleware/request-logger.ts`, `validate.ts`, `not-found.ts`, `error-handler.ts` | cross-cutting HTTP pipeline |
| `mappers/product.mapper.ts` | row ↔ DTO, cents ↔ decimal |
| `repositories/products.repository.ts` | `interface ProductsRepository` + `createProductsRepository(db)` |
| `services/products.service.ts` | `interface ProductsService` + `createProductsService({ productsRepository })` |
| `handlers/products.handler.ts` | `createProductsHandler({ productsService })` |
| `routes/products.routes.ts` | `createProductsRouter({ productsHandler })` |
| `test/` | test helpers (`createTestDatabase`, `createTestApp`), not part of the bundle |

`createApp` receives `{ db, logger }` (the guide foresaw `config` too; it is only needed from T4, so it is not passed now). `app.disable('x-powered-by')` avoids exposing the framework. Exported interfaces allow *fakes* in each layer's tests. **Alternatives**: DI container or classes (discarded: more ceremony for the size); per-resource folders (`modules/products/`; discarded by the user's decision for layers in top-level folders).

### D2. Paths derived from the code's location, not from the working directory
`getPaths(importMetaUrl)` computes `repoRoot` from the location of `server.ts` (`../../..`), which holds **both** for `apps/api/src/server.ts` and for `apps/api/dist/server.js` (same depth). From it come `.env` (`<root>/.env`), migrations (`<root>/apps/api/drizzle`) and the data set (`<root>/data/products.json`). Resolves T1's open question: a relative `DATABASE_PATH` is resolved against `repoRoot`, otherwise `npm run dev -w @vynyl/api` (cwd `apps/api`) would create another database. **Consequence**: the migrations and the data set are not embedded in the bundle; execution requires the repository checkout (which is the case for `npm start`). **Alternative**: embed the migrations in the bundle or copy them to `dist/`; discarded for more build with no gain for this project.

### D3. Validated configuration with fail fast and optional `.env`
`loadConfig(env)` validates an object with Zod (`NODE_ENV`, `PORT`, `DATABASE_PATH`, `LOG_LEVEL`, with defaults) and, if it fails, throws `ConfigError` whose message lists **each** invalid variable and the reason. `server.ts` prints that message to `stderr` (via `process.stderr.write`: the logger does not exist yet and `no-console` forbids `console`) and exits with code 1, before opening the database. `PORT` uses the same pattern as the query integers (`^\d+$` → number → range). The `.env` is loaded with `process.loadEnvFile` (native to Node, no `dotenv`), ignoring `ENOENT` and without overwriting the environment. **Assumption to confirm**: loading `.env` was not in the roadmap, but without it `.env.example` would have no function; it costs 5 lines and no dependency.

### D4. Database: client, URL, pragmas, migrations
`toDatabaseUrl(databasePath, repoRoot)` is pure: `:memory:` passes straight through; otherwise it resolves against `repoRoot` (an absolute path is respected) and returns `pathToFileURL(...).href`. `createDatabase` creates the parent folder if needed, opens the client, runs the pragmas (`foreign_keys=ON`, `busy_timeout=5000` always; `journal_mode=WAL` only for a file) and returns `{ client, db }` with `drizzle({ client, schema })`. The `client` is exposed so that tests and the future shutdown (T4) can close it. `runMigrations(db, migrationsDir)` uses the migrator from `drizzle-orm/libsql/migrator`. **Alternative**: `drizzle(url)` directly (hides the client; discarded).

### D5. Seed: validate everything, insert everything in one transaction, only with an empty table
`seedProducts(db, { file, logger })`: (1) counts the products; if there is any, it logs "seed skipped" and returns; (2) reads and does `JSON.parse` on the file (error with the file path); (3) validates the whole array with the product schema from `shared` (error indicating index and field); (4) inserts all in **one transaction**, preserving `id` and timestamps and converting the price with the mapper. Uniqueness of `id`/`sku` is left to the database constraints (the transaction rolls everything back), without duplicating the rule in code. Inserting an explicit `id` makes SQLite continue the sequence after the largest (the test confirms the next is 45, protecting T3's `POST`). Consequence: if all products are deleted (T3) and the API restarts, the seed runs again; that is the behavior defined in the guide ("only if the table is empty").

### D6. Contracts in `packages/shared`
- **A single `productSchema`** (field rules from the guide, section 6) used to type the response **and** validate the data set. T3 derives the input schemas with `omit({ id, meta })` and `partial()`. The roadmap spoke of two schemas; since the data set's format is identical to the response's, two would be duplication. Price: `number`, `>= 0`, `multipleOf(0.01)`; `category`: lowercase; `meta.*`: `z.iso.datetime()`.
- **`listProductsQuerySchema`**: `z.strictObject`; `limit` and `offset` as `string` with `^\d+$`, converted and bounded (`limit` 1–100 with default 30; `offset` ≥ 0 with default 0); optional `q`, `trim`, maximum 100 characters and empty → absent. Rejects repetition (array), unknown key, `1e2`, `+5`, empty and space.
- **`ErrorCode`** (the guide's six codes) and the envelope's **`apiErrorSchema`**. The code→status map lives in `api` (`Record<ErrorCode, number>`, exhaustive: adding a code without a status breaks compilation).
- **`ProductListResponse`**: `{ data: Product[], total, limit, offset }` (schema and type), plus the constants `DEFAULT_LIMIT`, `MAX_LIMIT`, `MAX_SEARCH_LENGTH`.
- Types via `z.infer`; no hand-written type.

### D7. Validation: result in `res.locals`, never in `req`
`validate({ query, params, body })` validates each provided source with Zod. On success, it stores the already converted values in `res.locals.validated.{query|params|body}` and calls `next()`; on failure, it calls `next(new AppError('VALIDATION_ERROR', ...))` with `details` `[{ path, message }]` (`path` of the Zod issues joined by `.`; empty for root issues, such as an unknown key). A typed accessor (`getValidated<T>(res, 'query')`) concentrates the single type-assertion point. **Reason**: `req.query` is read-only in Express 5 (evidence above). **Alternatives**: overwrite with `Object.defineProperty` (fragile hack), validate inside each handler (mixes layers and repeats code). `params` and `body` are implemented and tested now because T3 uses them.

### D8. Errors: `AppError`, central handler, 404
`AppError(code, message, { details, cause })` derives the `status` from the map. The `error-handler` is the only place that decides the response: `AppError` → envelope with the code's status; any other error → logs the full error with `req.log.error({ err })` and responds `500 INTERNAL_ERROR` with a generic message; if the headers were already sent, it delegates with `next(err)`. `not-found` creates an `AppError('NOT_FOUND')` for any route with no match. Handlers and services only throw `AppError` (or let the error bubble up). There is no mapping of Express/body-parser HTTP errors yet (e.g. 413), since the JSON parser only comes in at T3.

### D9. Logs: pino + pino-http on an allowlist
`createLogger({ level, destination? })` creates the `pino` (the optional `destination` allows capturing lines in tests). `request-logger` uses `pino-http` with: `genReqId` (reuses an `X-Request-Id` matching `^[A-Za-z0-9_-]{1,64}$`, otherwise UUID, and returns it in the header), **own serializers** that emit only `{ id, method, url }` and `{ statusCode }`, and `customLogLevel` (`info` < 400, `warn` 4xx, `error` 5xx). Allowlist instead of redaction (`redact`): it does not depend on remembering each sensitive header. The URL includes the query string (search terms are not sensitive). **Alternative**: `redact` of `Authorization`/`Cookie` (discarded: a blocklist fails silently when a new header appears).

### D10. Repository, service, mapper, handler and route
- **Repository** (`list({ limit, offset, search? })`): two queries with the same `WHERE` (page ordered by `id ASC` with `limit/offset` and `count(*)`), returning `{ rows, total }`. The search applies `title LIKE ? ESCAPE '\' OR description LIKE ? ESCAPE '\'` with the pattern `%${escapeLikePattern(q)}%`, always parameterized. `escapeLikePattern` (in `lib/like.ts`, pure and tested) escapes `\`, `%` and `_`.
- **Service** (`list(query)`): calls the repository, converts the rows with the mapper and builds `{ data, total, limit, offset }`. It is an async function that is pure in its inputs, which allows wrapping it with singleflight in T4 without changing the signature. No additional business rule in this task.
- **Mapper**: `toProduct(row)` (`priceCents / 100`, nested `meta`) and `toProductInsert(product)` (`Math.round(price * 100)`, exact because the price was already validated with up to 2 places).
- **Handler**: reads `getValidated(res, 'query')`, calls the service and responds `res.json`. **Route**: `GET /` with `validate({ query })`, mounted at `/api/products`.

### D11. Testing strategy (pattern for the next tasks)
Tests next to the code (`*.test.ts`), without mocking what is under test:
- `shared`: schema rules (valid values and each violated rule), defaults and query rejections, error contract.
- `api` unit: `mapper`, `escapeLikePattern`, `AppError`, `loadConfig`, `toDatabaseUrl`/`getPaths`, `validate` and `error-handler` (with a minimal Express app).
- `api` with a **real in-memory database** (`createTestDatabase`: `:memory:` client + migrations): repository (pagination, order, total, search, wildcards, `offset` beyond the end) and seed (idempotence, atomicity, ids, cents, next id).
- `service` with a *fake* repository (only checks parameter forwarding, mapping and envelope).
- **Routes with Supertest** over the real `createApp`: the specs' scenarios (30 default, pagination, search, each 400, 404, `X-Request-Id`, absence of `x-powered-by`) and a real 500 case (close the `client` before the request and verify a generic body + log). Logs are captured with `pino` pointing to an in-memory stream.
The real data set (44 items) is used in the seed and route tests; counts are read from the file itself, with no fixed numbers beyond those defined in the specs.

### D12. Bundle and execution
No new dependencies. `tsup` keeps embedding `@vynyl/shared`; `import.meta.url` is pure ESM and works in the bundle. Mandatory runtime verification (tasks 6.x): `tsx` (dev) and `node dist/server.js` from another working directory, proving that paths come from `repoRoot`.

## Points for the user's review (model task checkpoint)

What is approved here becomes the pattern. These deserve attention: (1) organization in factories with injection by parameter and file names; (2) validation in `res.locals` with a typed accessor; (3) error envelope, `AppError` and status map; (4) a single `productSchema` and `strictObject` on the query; (5) test style (real in-memory database, Supertest, captured logs); (6) allowlist logs; (7) path resolution from the repository root and optional `.env`.

## Risks / Trade-offs

- **Bad pattern replicated** → explicit review before T3 (section above); pattern changes go into the design/roadmap.
- **Page and total in two queries** (no single snapshot) → acceptable: local SQLite, single writer, no concurrent load; if needed, a read transaction solves it.
- **`LIKE` only ignores case for ASCII and does a scan** → limitation documented in the guide; irrelevant for 44 records.
- **`res.locals.validated` depends on a typed cast** → concentrated in a single accessor with tests.
- **JSON logs in development** (no `pino-pretty`, which would be a new dependency) → readable enough; revisit if it bothers.
- **Migrations and data set outside the bundle** → execution requires the whole repository (like `npm start`); recorded in the README (T8).
- **`PRAGMA foreign_keys`** still has no effect (there are no foreign keys) → only guarantees the safe default for the future; the test checks the effective value.
- **libsql's SQLite 3.45.1** (`better-sqlite3` would have 3.53) → enough for `LIKE ... ESCAPE`, `count`, `strftime` and WAL (verified).
- **On Windows libsql does not release the file after `client.close()`** (measured: `EPERM` when removing the database while the process lives, with or without WAL) → tests with a file database clean the temporary directory on a best-effort basis (the OS discards it later); most tests use `:memory:`. It also applies to T7's e2e: delete the file only after the process ends. Transactions and `PRAGMA`s were verified: the pragmas persist after `db.transaction()` and `db.batch()`.
- **Tests coupled to the real data set** → counts derived from the file; they fail clearly if the data set changes.
- **Native Express HTTP errors (e.g. 413) still become 500** → they only appear with the JSON parser, which comes in at T3 together with the corresponding mapping.

## Migration Plan

Does not apply (first backend code; no change to schema or existing data). Rollback: revert the task's commit; the generated `data/app.db` file is ignored by git and can be deleted.

## Open Questions

- None that block. Confirm in the review the optional `.env` assumption (D3). Closing the `client` when the process ends is handled in T4 (graceful shutdown).
