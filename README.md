# Product Catalog (Vynyl technical assessment)

A small product catalog: a **REST API** (Express 5, TypeScript, SQLite) and a **single-page app** (Svelte 5) to browse, search, view, create, edit and delete products. The whole thing runs locally from one command, with no Docker and no external services.

- **API:** list (30 per page by default), get one, search by name or description, create, update and delete products, with validation, standardized errors, rate limiting, a health check and graceful shutdown.
- **SPA:** dashboard with search and pagination, product detail, create and edit form, delete with confirmation, toasts. Mobile-first and responsive.
- **Extra feature:** a resilient REST client (retry with exponential backoff) and a backend singleflight. See [Extra feature](#extra-feature-resilience-and-scale).
- **Stack:** TypeScript everywhere; Express 5 (chosen over the suggested Hono out of preference), Drizzle ORM on SQLite through `@libsql/client` (a driver without native compilation: `better-sqlite3` v13 failed to install from the lockfile), Zod schemas shared by the API and the SPA, Svelte 5 with Vite, plain CSS with design tokens, Vitest.
- **How it was built:** with an AI coding agent, one spec-driven change per task. See [AI.md](AI.md).

## Run it

**Prerequisites:** Node.js **22.22.2 or later, or 24.15 or later** (an `.nvmrc` pins Node 24; `nvm use` picks it) and npm. Nothing else.

```bash
git clone <repository-url>
cd vynyl
npm install
npm start
```

Then open **http://localhost:3000**.

`npm start` builds every package, applies the database migrations, seeds the catalog with 44 products the first time (only when the table is empty) and starts one server that serves both the API and the SPA. There are no other steps.

**Settings** are environment variables, all optional; copy `.env.example` to `.env` if you want to change them (real environment variables win over `.env`):

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3000` | Port of the server |
| `DATABASE_PATH` | `./data/app.db` | SQLite file (relative to the repository root) |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent` |
| `RATE_LIMIT_MAX` | `100` | Requests per client and window under `/api` |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Length of the rate limit window |
| `TRUST_PROXY` | `0` | Reverse proxies whose `X-Forwarded-For` is trusted |
| `NODE_ENV` | `development` | Only appears in the startup log |

An invalid value stops the server at startup with a message naming every problem.

**Change the port** (PowerShell: `$env:PORT = 3001; npm start`; bash: `PORT=3001 npm start`).

**Reset the data:** stop the server and delete `data/app.db` (and `data/app.db-wal`, `data/app.db-shm` if present). The next start recreates and reseeds it. The database file is not versioned.

## Development and tests

```bash
npm run dev      # API with reload on :3000 + Vite on http://localhost:5173 (proxies /api to :3000)
npm test         # unit and route tests of every package
npm run lint
npm run typecheck
```

| Script (from the root) | What it does |
|---|---|
| `npm start` | Build everything, then run the bundled server (API + SPA) |
| `npm run dev` | API and Vite dev server together |
| `npm run build` | Bundle the API (`tsup`) and build the SPA (`vite build`) |
| `npm test` | Vitest in `shared`, `api` and `web` |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint / TypeScript and `svelte-check` / Prettier |
| `npm run db:generate -w @vynyl/api` | Generate a new SQL migration from the Drizzle schema |

In development the API and the Vite server run on different ports, so use `http://localhost:5173` for the SPA. The Vite proxy expects the API on port 3000.

**What the tests cover.** All of them run in memory, with no network and no real clock:

- **API** (Vitest and Supertest): every route against a real SQLite in memory with the real migrations and the real dataset; each layer with fakes below it; config, seed, mappers, middleware, rate limit, health, shutdown, singleflight and the SPA serving rules.
- **Shared**: the Zod schemas that both sides use.
- **SPA** (Vitest and Testing Library on jsdom): the HTTP client with fake timers (retry, backoff, timeout, cancellation), components, pages with a fake API, and routing.
- **Not covered:** end-to-end browser tests. See [What is not done](#what-is-not-done-and-what-comes-next).

## Repository layout

```
.
├── apps/
│   ├── api/                 Express 5 API
│   │   ├── drizzle/         versioned SQL migrations
│   │   └── src/
│   │       ├── routes/      method + path -> handler (+ validation)
│   │       ├── handlers/    HTTP layer: read the request, call the service, write the response
│   │       ├── services/    business rules (SKU conflicts, 404s, singleflight on reads)
│   │       ├── repositories/  the only code that talks to the database (Drizzle)
│   │       ├── mappers/     database row <-> API representation (cents <-> decimal price)
│   │       ├── middleware/  request id + logging, validation, rate limit, errors, SPA serving
│   │       ├── db/ config/ lib/   connection, migrations, seed; validated env; errors, singleflight, logger
│   │       └── server.ts    composition root (the only place that reads the environment)
│   └── web/                 Svelte 5 SPA
│       └── src/
│           ├── components/  Atomic Design: atoms, molecules, organisms, templates, pages
│           ├── lib/         HTTP client (retry/backoff), products API, router, form logic, toasts
│           └── styles/      design tokens (the only source of colors, spacing, type) and base styles
├── packages/shared/         Zod schemas, types and error codes used by both apps
├── data/products.json       the seed dataset (44 products, 6 categories, 4 brands)
└── openspec/                the specs of every change (see below)
```

The API depends downward only (routes, handlers, services, repositories) and every layer receives its dependencies as parameters, so each one is tested on its own. In the SPA only the pages call the API, and a lint rule enforces it.

## API

Everything under `/api`, JSON in and out.

| Method | Path | Description | Success |
|---|---|---|---|
| `GET` | `/api/products?limit=30&offset=0&q=` | Paginated list, optional search | `200 { data, total, limit, offset }` |
| `GET` | `/api/products/:id` | One product | `200` |
| `POST` | `/api/products` | Create | `201` + `Location` header |
| `PATCH` | `/api/products/:id` | Partial update | `200` |
| `DELETE` | `/api/products/:id` | Delete | `204` |
| `GET` | `/health` | Liveness, checks that the database answers (outside `/api`, not rate limited) | `200 { "status": "ok" }`, `503` otherwise |

A product looks like this (`price` is a decimal with at most two places; `meta` is set by the server):

```json
{
  "id": 1, "title": "Large Flux Capacitor", "description": "...", "category": "automotive",
  "price": 9.99, "stock": 42, "brand": "ACME", "sku": "ACM-FC-001", "weight": 4,
  "meta": { "createdAt": "2025-04-30T09:41:02.053Z", "updatedAt": "2025-04-30T09:41:02.053Z" }
}
```

Field rules (the same Zod schemas validate the API and the forms): `title` 1-200 characters; `description` 1-2000; `category` 1-50, lowercase; `price` at least 0 with at most 2 decimals; `stock` a whole number, 0 or more; `brand` 1-100; `sku` 3-40 characters of `A-Z`, `0-9` and `-`, unique; `weight` above 0. Strings are trimmed. Unknown fields, and `id` or `meta` in a body, are rejected.

**Errors** always have this shape, and never carry a stack trace or internal detail:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": [{ "path": "price", "message": "..." }] } }
```

| Code | Status | When |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Invalid body, query or `:id` (including `limit` above 100) |
| `PRODUCT_NOT_FOUND` | 404 | No product with that id |
| `NOT_FOUND` | 404 | Unknown route |
| `SKU_CONFLICT` | 409 | Another product already has that SKU |
| `RATE_LIMITED` | 429 | Too many requests (with `Retry-After`) |
| `INTERNAL_ERROR` | 500 | Anything unexpected (details only in the log) |

## Product decisions

Choices made where the assignment left room, or to make the product coherent:

- **`PATCH`, not `PUT`.** Partial update; at least one field is required and `meta.updatedAt` is refreshed. The SPA sends every field of the form.
- **Hard delete**, behind a confirmation dialog in the UI.
- **Pagination by `limit` and `offset`.** 30 by default, 100 at most; a larger value is a `400`, not silently truncated. The order is always by `id`, so pages are stable.
- **Search is a case-insensitive substring match on title and description**, a bit more useful than the exact match the assignment accepts. `%` and `_` in the term are matched literally. SQLite's `LIKE` is case-insensitive for ASCII only.
- **Prices are stored as integer cents** and shown as decimals, so `19.99` never becomes `19.990000000000002`.
- **The server owns `id` and `meta`.** They cannot be sent.
- **SKU is unique**, enforced by a database constraint (not by "check, then insert"), so two concurrent requests cannot both win.
- **Category is a lowercase text field** on the product, as the assignment describes it; there is no categories table.
- **One error format** for every failure, with stable codes the SPA can rely on.
- **UI:** the price is shown in US dollars; stock is labelled "Out of stock" at 0, "Low stock" from 1 to 10 and "In stock" above that (a presentation choice, not part of the API); search waits 300 ms after the last keystroke; a duplicate SKU is shown on the SKU field.

## Assumptions

- A single currency (USD) and a single language (English).
- A small catalog, so a `LIKE` scan on title and description is fine (an index does not help a `%term%` search).
- One local server process: the rate limit counts in memory, per process.
- Nobody needs to log in, and every visitor may create, edit and delete.
- The dataset is invented (a light inter-dimensional theme); the first two products are the ones in the assignment.
- The evaluator runs a current Node LTS (see the prerequisites).

## Open questions

- Should categories become their own entity, with the optional endpoints (create a category, list categories, products by category)? The current model would need a migration that turns the existing category texts into rows.
- What is the unit of `weight`? The template gives none, so the UI shows the bare number.
- Is a substring search wanted, or the exact match the assignment accepts?
- Should deleting be reversible (soft delete)?
- Who is allowed to change the catalog? There is no authentication.
- Should the `PUT` verb be offered as well as `PATCH`?

## Extra feature: resilience and scale

**Problem.** A client that talks to a busy or flaky server sees transient failures (timeouts, `429`, `502`/`503`/`504`, dropped connections), and a server under load repeats identical work. Without care, users see errors that would have gone away on a retry, and a retry can duplicate an action.

**Who benefits.** The people using the app, who no longer see a failure for every short blip, and whoever operates it, who gets predictable behavior under load. It adds no visible feature, which is the point.

**Why this one.** It shows how failures are handled at both ends of the wire, and it is testable without a browser.

**What it does.**

- **REST client with retry and exponential backoff** (`apps/web/src/lib/api/http-client.ts`): a timeout per attempt (10 s), cancellation by the caller, and up to 3 retries with full-jitter backoff (300 ms base, factor 2, 5 s cap). It retries **only requests that are safe to repeat** (`GET`, `HEAD`, `PUT`, `DELETE`) and **only** on network errors, timeouts and `408`, `429`, `502`, `503`, `504`. `POST` and `PATCH` are never retried, so a retry cannot create a product twice. A `Retry-After` header is honored, up to the cap. Failures become a typed `ApiError` read from the standard error format.
- **Singleflight on reads** (`apps/api/src/lib/singleflight.ts`): identical reads in flight at the same time share one repository call and one result. It never applies to writes and does not cache anything.
- Around it, in the API: rate limiting on `/api` (429 with `Retry-After`), a `/health` endpoint, and a graceful shutdown that stops accepting connections and lets in-flight requests finish (10 s at most) before closing the database.

**Known limitation, measured and not hidden.** With SQLite on a local file the singleflight **does not reduce database queries in practice**. The query runs on the main thread, so two identical reads are never really in flight at the same time; this holds even with the asynchronous `@libsql/client` driver (five separate requests ran the query five times). Only reads issued in the same tick coalesce. The component is implemented and tested with a simulated asynchronous loader, and it only pays off with a database reached over the network (for example PostgreSQL) or reads moved to worker threads.

## Quality and security

- Every external input is validated with Zod before use: bodies, query strings, path parameters, the environment and the seed file. Unknown keys are rejected.
- Queries are parametrized through Drizzle, `LIKE` wildcards are escaped, and request bodies are limited to 100 kb.
- Errors carry no internal detail. Logs are structured (pino) with a request id, list only method, URL and status, and never include headers or bodies.
- The configuration is validated at startup and a bad value stops the server. Migrations are versioned and applied at startup, and the seed is idempotent.
- TypeScript is strict, with ESLint and Prettier on the whole repository.
- **Verified in a browser** while building: the flows and the layout at 360, 768 and 1280 px, in Electron, and by hand by the developer. See the limits below.

## What is not done, and what comes next

- **End-to-end tests (Cypress).** Left out for time. What exists instead is unit, component and route tests, and manual browser checks. Next: a Cypress suite against the running server with a temporary database (list, search, paginate, create, edit, delete, duplicate SKU) plus one mobile-viewport smoke test. The `cypress` dependency and `apps/web/cypress.config.ts` are still in the repository but there are no specs.
- **Optional endpoints:** sorting, and categories (create, list, list of names, products by category). Next: a `sortBy` whitelist with `order`, and a `categories` table with a migration.
- **GitHub Actions.** Next: one workflow with four jobs: lint, typecheck, unit tests and build.
- **Authentication and authorization.** The API is open.
- **`helmet` and a restricted CORS policy.** Not needed for the same-origin setup here, but they would be part of any real deployment.
- **`NODE_ENV=production` in `npm start`.** Setting it portably needs a small dependency (`cross-env`); today it only changes a field of the startup log.
- **A network database.** It would make the singleflight effective and allow more than one server process (the rate limit would then need a shared store).
- **Frontend polish:** focus is not moved to the new screen after a navigation, there is no warning about unsaved changes, and two people editing the same product at once overwrite each other (the form sends every field).
- **Tested in one browser only** (Electron), with no real screen reader. Keyboard use and labelling follow standard practice but were not tried with assistive technology.

## Known installation issues

- **Windows and long paths.** Clone into a short path (for example `C:\src\vynyl`). A very long base path can break the installation of Cypress, which is only a leftover dev dependency.
- **`npm` warns that install scripts were not run** (recent versions of npm block them by default). It is harmless here: the app builds and runs without them.
- **Port 3000 in use:** set `PORT`. In development the Vite proxy expects the API on 3000, so free that port instead.

## How this was built

The work was planned first in a written decision guide, then split into tasks, each one an OpenSpec change (proposal, specs, design, tasks) implemented with an AI coding agent and reviewed by the developer. The specs of every change live in `openspec/specs`. [AI.md](AI.md) tells how the collaboration went: what worked, what did not, and what was not verified.

The working documents (`PROJECT_GUIDE.md`, `OPENSPEC_TASKS.md`, `DELIVERABLES.md`, `CLAUDE.md` and `openspec/`) are the planning notes and are written in Portuguese.
