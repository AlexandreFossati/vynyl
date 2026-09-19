# Project Guide — Vynyl Test (Knowledge Base)

> Reference document for every implementation session (OpenSpec). It consolidates what `requirements.pdf` demands (see the full checklist in `DELIVERABLES.md`) and the technical decisions made in the 2026-09-18 planning session.
> No code was written in this phase.
> **Companion files**: `CLAUDE.md` (the agent's profile and working rules, loaded automatically in every session), `OPENSPEC_TASKS.md` (the breakdown of development into OpenSpec tasks/changes) and `DELIVERABLES.md` (the PDF checklist). This guide is the source of truth for technical decisions; if a decision changes, update it.

## 0. Principles (ground rules)

1. **Closed scope**: implement only what the PDF asks for. Nothing beyond that. The extra feature is required by the PDF, so it is in scope.
2. **Production quality within that scope**: validation at the edge, standardized errors, tests, migrations, validated config, logs, basic security, code organized in layers. "Production ready" here means doing well what was asked, not adding features.
3. **Short deadline (60–90 min as a reference)**: prefer the simplest solution that works. Prioritize P0 → P1 → P2 (section 13).
4. **Communication is an evaluation criterion**: README, AI.md and product decisions must be clear. Record decisions and limitations along the way, not only at the end.
5. **Onboarding**: treat the repo as if other devs will use it. `git clone` → `npm install` → `npm start` must work with no hidden steps.
6. **The agent follows the profile defined in `CLAUDE.md`**: senior developer/specialist, with good practices, security and scope discipline in every implementation.
7. **Language**: project deliverables (code, comments, messages, commits, README.md, AI.md) are **always in English**; OpenSpec artifacts and planning documents were in Portuguese during development and were later translated to English. Details in `CLAUDE.md`.

## 1. Summary of what the PDF requires

- SPA + API running locally; the evaluator clones the repo and follows the instructions until a working web page.
- Data set following the product template (section 6).
- **Required API**: list (30 by default), get one, search by name/description, create (POST), update (PUT/PATCH), remove.
- **Optional API**: sorting, create category, list categories, category list, products by category.
- **SPA**: an interface that exercises the API (e.g. dashboard with list/summaries, detail, create, edit, delete).
- **Tests and "other normal things"** (unit, etc.).
- **Extra feature** not specified, with an explanation of the problem, the audience and the reason for the choice.
- **Product decisions** that clarify/extend the specification, documented.
- **If something is left incomplete**: explain what would be done next.
- **Deliverables**: GitHub link with code + `README.md` + `AI.md`; and a screen recording of the coding session **or** a full trace of the prompts/interactions with agents.

## 2. Stack decisions (confirmed by the user)

| Topic | Decision | Note |
|---|---|---|
| Language | **TypeScript** (API and SPA) | `strict` on |
| API | **Express** (use version 5) | Instead of Hono, at the user's preference. Express 5 handles errors from async handlers |
| Frontend | **Svelte + Vite** (Svelte 5, runes) | Plain SPA, no SvelteKit |
| Database | **SQLite** | Local file, no Docker |
| Data access | **Drizzle ORM + @libsql/client** (SQLite in a local file) | Schema in TS, migrations versioned with drizzle-kit. Async driver with no `node-gyp`: `better-sqlite3` v13 fails on `npm install` from the lockfile (see section 11.3) |
| Validation/contract | **Zod**, schemas shared API ↔ SPA | `packages/shared` package |
| Styling | **Plain CSS** with Svelte scoped styles + design tokens (CSS variables) | No Tailwind or component lib |
| UI | **Clean, simple and mobile-first responsive** (frontend prerequisite) | See section 10.2 |
| API architecture | **Explicit layers**: routes → handlers → services → repositories | See section 4 |
| Web architecture | **Atomic Design**: atoms, molecules, organisms, templates, pages | See section 10.1 |
| Unit tests | **Vitest** (backend and frontend) | Testing Library on the frontend |
| E2E tests | **Cypress** | CRUD flow through the UI |
| Structure | **Monorepo with npm workspaces** | `apps/api`, `apps/web`, `packages/shared` |
| Execution | **`npm start`** only | No Docker (see section 9) |
| Runtime | **Pinned Node LTS** | `.nvmrc` + `engines` field |
| Quality | **ESLint + Prettier + TS strict** | Single config at the root |
| Logs | **pino** + request id | No sensitive data |
| Config | **Env validated with Zod**, graceful shutdown, `/health` | Fail fast on invalid env |
| Security | **Rate limiting** (`express-rate-limit`) + validation of all input + parameterized queries | See section 8 |

## 3. Repository structure

```
.
├── package.json              # workspaces, root scripts
├── .nvmrc                    # Node LTS
├── eslint.config.js / .prettierrc / tsconfig.base.json
├── .env.example
├── README.md                 # how to run, assumptions, decisions, next steps
├── AI.md                     # narrative of the AI workflow, what worked/failed
├── data/
│   └── products.json         # data set in the template format (>= 40 items)
├── packages/
│   └── shared/               # Zod schemas, types, error codes, constants
│       └── src/
├── apps/
│   ├── api/
│   │   ├── drizzle/          # generated SQL migrations
│   │   └── src/
│   │       ├── server.ts     # bootstrap, shutdown
│   │       ├── app.ts        # createApp(deps): wires middlewares, routes and injects the layers
│   │       ├── config/       # validated env (Zod)
│   │       ├── routes/       # maps method+path -> handler (+ validation middleware)
│   │       ├── handlers/     # HTTP layer: reads req, calls service, writes res
│   │       ├── services/     # business rules (+ singleflight on reads)
│   │       ├── repositories/ # data access (Drizzle); the only place that talks to the DB
│   │       ├── mappers/      # database row <-> API DTO (cents <-> decimal)
│   │       ├── db/           # connection, Drizzle schema, migrate, seed
│   │       ├── middleware/   # request-id/logger, validate, rate-limit, error-handler
│   │       └── lib/          # singleflight, logger, errors (AppError and subclasses)
│   └── web/
│       ├── cypress/          # e2e
│       └── src/
│           ├── lib/api/      # http-client (retry/backoff), products-api
│           ├── lib/          # stores, utils, formatting
│           ├── styles/       # tokens.css, base.css
│           └── components/   # Atomic Design
│               ├── atoms/        # Button, Input, Label, Badge, Spinner, Icon...
│               ├── molecules/    # FormField, SearchBox, PriceTag, StockBadge, Pagination...
│               ├── organisms/    # ProductList (table/cards), ProductForm, ConfirmDialog, Toaster, Header
│               ├── templates/    # AppShell, PageLayout (layout only, no data)
│               └── pages/        # DashboardPage, ProductDetailPage, ProductCreatePage, ProductEditPage
```

Conventions: file names in `kebab-case` (Svelte components in `PascalCase`); one file per resource in each backend layer (`products.handler.ts`, `products.service.ts`, `products.repository.ts`, `products.routes.ts`, `products.mapper.ts`); tests next to the code (`*.test.ts`); SPA with no duplicated business rules (validation comes from `shared`). The rules for each layer are in sections 4 and 10.

## 4. Backend architecture

**Layers** (the flow of a request): `routes` → `handlers` → `services` → `repositories` → SQLite. The `mappers` convert database row ↔ API DTO.

| Layer | Responsibility | May | May not |
|---|---|---|---|
| `routes` | Declare method + path, plug in validation and the handler | Reference handlers and middleware | Contain logic |
| `handlers` | HTTP layer: extract already-validated data from `req`, call the service, choose the status and build the response | Know `req`/`res` | Business rules, access the DB |
| `services` | Business rules and orchestration (e.g. duplicate SKU → `AppError`, 404, singleflight on reads) | Call repositories and mappers, throw `AppError` | Know `req`/`res`/HTTP, build SQL |
| `repositories` | Single point of access to the DB (Drizzle queries, pagination, search) | Return rows/entities | Business rules, throw HTTP errors |
| `mappers` | Pure conversions (cents ↔ decimal, `meta`) | Pure functions | Side effects |

Rules: dependencies only go down (handler → service → repository); each layer receives its dependencies by parameter (injection via `createApp`), with no imports of singletons, which allows testing each layer in isolation. Domain errors are `AppError` with `code`/`status` and only the central error handler decides the HTTP response. To add a new resource (e.g. categories), create one file per layer following the same pattern.

- `createApp(deps)` receives config/db/logger, allowing tests with SQLite `:memory:`.
- Middleware in order: request id + log → rate limit (on `/api`) → JSON parser (Express default limit) → routes → 404 → **central error handler**.
- Validation via middleware that uses Zod schemas from `packages/shared` (body, query, params). Objects with unknown keys are rejected (`strict`).
- Express also serves the SPA static files (`apps/web/dist`) and falls back to `index.html` on routes that do not start with `/api`.
- **Graceful shutdown**: on SIGINT/SIGTERM, stop accepting connections, close the server and then the DB.
- `/health` outside the `/api` prefix and outside the rate limit; checks that the DB responds.

## 5. Database

- File at `./data/app.db` (ignored by git), path configurable via `DATABASE_PATH` (converted to the `file:` URL that `@libsql/client` receives; `:memory:` in tests).
- Pragmas run on the connection: `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout`.
- **Migrations**: generated with drizzle-kit, versioned in the repo and applied programmatically at start.
- **Idempotent seed**: reads `data/products.json`, validates with Zod, converts the price to cents and only inserts if the table is empty.
- **`products` table**:

| Column | Type | Rules |
|---|---|---|
| `id` | integer PK autoincrement | |
| `title` | text | not null |
| `description` | text | not null |
| `category` | text | not null, **index** |
| `price_cents` | integer | not null, `>= 0` (API exposes a decimal `price`) |
| `stock` | integer | not null, `>= 0` |
| `brand` | text | not null |
| `sku` | text | not null, **unique** |
| `weight` | real | not null, `> 0` |
| `created_at` / `updated_at` | text ISO-8601 (UTC) | managed by the server |

- **Category** is a text column on the product (the PDF only requires it this way). If the optional category features are implemented, introduce a `categories` table via migration.
- Search via `LIKE` with escaped wildcards (`ESCAPE`). An index does not help with `%q%`; acceptable at the scale of the test. Limitation: SQLite's `LIKE` is case-insensitive only for ASCII.

## 6. Data set and product contract

`data/products.json` in the PDF's format (valid JSON, no trailing commas), **at least 40 products** so that the default of 30 per page and pagination can be demonstrated. ACME/inter-dimensional theme, varied categories, unique and coherent SKUs.

Product representation in the API:

```json
{
  "id": 1,
  "title": "Large Flux Capacitor",
  "description": "...",
  "category": "automotive",
  "price": 9.99,
  "stock": 42,
  "brand": "ACME",
  "sku": "ACM-FC-001",
  "weight": 4,
  "meta": { "createdAt": "2025-04-30T09:41:02.053Z", "updatedAt": "2025-04-30T09:41:02.053Z" }
}
```

**Validation rules (Zod schemas in `shared`)**

| Field | Rule |
|---|---|
| `title` | string 1–200, trim |
| `description` | string 1–2000, trim |
| `category` | string 1–50, lowercase, trim |
| `price` | number `>= 0`, at most 2 decimal places |
| `stock` | integer `>= 0` |
| `brand` | string 1–100, trim |
| `sku` | string 3–40, pattern `^[A-Z0-9-]+$`, unique |
| `weight` | number `> 0` |
| `meta.*` | read-only: generated by the server, ignored/rejected on input |

## 7. API

Prefix `/api`. JSON everywhere.

### Required (P0)

| Method | Route | Description | Success |
|---|---|---|---|
| GET | `/api/products?limit=30&offset=0&q=` | Paginated list, with optional search | 200 `{ data, total, limit, offset }` |
| GET | `/api/products/:id` | Single product | 200 |
| POST | `/api/products` | Creates a product | 201 + `Location` header |
| PATCH | `/api/products/:id` | **Partial** update; updates `meta.updatedAt` | 200 |
| DELETE | `/api/products/:id` | Removes (hard delete) | 204 |

Decisions:
- **Pagination**: `limit` defaults to **30**, maximum **100**, `offset` defaults to 0. Default order is deterministic by `id ASC`. Out-of-range values (e.g. `limit=101`) → **400 `VALIDATION_ERROR`**, with no silent truncation.
- **Search (`q`)**: case-insensitive substring on `title` **and** `description` (more useful than an exact match and still satisfies the PDF). Combines with pagination.
- **PATCH** instead of PUT: partial, requires at least one field.
- Invalid `id` (not a positive integer) → 400; nonexistent → 404.

### Standardized error format

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": [{ "path": "price", "message": "..." }] } }
```

| Situation | HTTP | `code` |
|---|---|---|
| Validation (body/query/params) | 400 | `VALIDATION_ERROR` |
| Product not found | 404 | `PRODUCT_NOT_FOUND` |
| Nonexistent route | 404 | `NOT_FOUND` |
| Duplicate SKU | 409 | `SKU_CONFLICT` |
| Rate limit exceeded | 429 | `RATE_LIMITED` (+ `Retry-After`) |
| Unexpected error | 500 | `INTERNAL_ERROR` (no stack/detail leak; detail only in the log) |

### Optional (P2, nice to have — only if time is left)

- Sorting: `sortBy` (column whitelist) and `order=asc|desc`.
- Categories: list all (objects), list names (strings), create category, products by category (`?category=` or a dedicated route). The PDF mentions "Get all product categories" and "Get product category list" separately; interpret as a list of objects vs a list of names.

## 8. Security and operation

Included:
- Validation of all input with Zod (body, query, params); unknown keys rejected.
- Parameterized queries via Drizzle; `LIKE` with escaped wildcards; whitelist for sort columns (P2).
- **Rate limiting** on `/api` (suggested default: 100 req/min per IP, configurable via env), with standard headers and a 429 response in the standardized error format. Configure `trust proxy` according to the environment.
- Internal errors do not leak details; structured logs (pino) with request id, no sensitive data.
- Config via env validated at boot; `.env.example` versioned; `.env` and `data/*.db` in `.gitignore`.
- Body limit: only the `express.json()` default (100 kb).

**Left out by the user's decision** (document in the README as an assumption/next step):
- Authentication/authorization (not in the PDF): the API is open.
- `helmet` (security headers) and restricted CORS. Since the SPA and API are served from the same origin, CORS is not needed in production; in dev mode use the Vite proxy.

## 9. Execution (`npm start`)

- `npm install` at the root installs all workspaces.
- **`npm start`**: builds `shared`, `api` and `web`, applies migrations, runs the idempotent seed and brings up Express serving API + SPA at **http://localhost:3000**. One command, one port.
- **`npm run dev`**: API with reload + Vite with a proxy to `/api` (for development).
- Root scripts: `lint`, `typecheck`, `format`, `test` (Vitest in all workspaces), `test:e2e` (Cypress, against the server with a temporary DB).
- No Docker. Node LTS via `.nvmrc`/`engines`.

## 10. Frontend (SPA)

- Svelte 5 + Vite + TS, `svelte-check` in typecheck.
- **Router**: lightweight, based on the History API, compatible with Svelte 5. Validate the chosen library in the OpenSpec design; the fallback is a minimal in-house implementation. Express falls back to `index.html`.
- **Screens**:
  - **Dashboard/list (home)**: table (desktop) and cards (mobile) with a summary of the products, search (debounced), pagination, loading/empty/error states.
  - Product **detail**.
  - **Create** and **Edit** (shared form; validation with the same Zod schema from `shared`; per-field errors; duplicate SKU 409 shown on the field).
  - **Delete** with a confirmation dialog.
- Feedback with toasts for success/error; buttons disabled while submitting.
- **Basic accessibility**: associated labels, managed focus in dialogs, keyboard navigation, `aria-live` for messages, adequate contrast.
- State with Svelte stores/runes; no extra state or fetching library.

### 10.1 Component organization: Atomic Design

Five levels in `src/components/`, with dependencies only **downward** (page → template → organism → molecule → atom):

| Level | What it is | Rules | Examples in this project |
|---|---|---|---|
| `atoms` | Indivisible UI element | Only props and events; no business state, no API; styled only by tokens | Button, Input, Select, Label, Badge, Spinner, Icon |
| `molecules` | Small combination of atoms with one function | No API calls | FormField (label + input + error), SearchBox, PriceTag, StockBadge, Pagination, Toast |
| `organisms` | Functional interface block | Receive data and callbacks via props; no API calls | ProductList (table/cards), ProductForm, ConfirmDialog, Toaster, Header |
| `templates` | Layout skeleton | Only positioning and slots; no data | AppShell, PageLayout |
| `pages` | Screens tied to routes | **The only level that fetches/changes data** (via `lib/api`) and connects stores | DashboardPage, ProductDetailPage, ProductCreatePage, ProductEditPage |

Rules: one component per file, name in `PascalCase`; if a component is used by a single parent and will never be reused, keep it simple (do not create an atom for the sake of it); typed props; no component below `pages` imports from `lib/api`.

### 10.2 UI: design prerequisite (clean, simple and responsive)

Goal: look professional and clean **without** a high maintenance cost. Done with plain CSS and tokens only, no UI library.

- **Design tokens** in `styles/tokens.css` (the single source of colors, spacing, typography, radius, shadows): neutral palette + 1 accent color + semantic colors (success, warning, danger); spacing scale (4/8/12/16/24/32/48); typographic scale; 2–3 radii; 2 shadows. No magic values in components.
- **Visual**: plenty of white space, clear typographic hierarchy, few colors, soft borders, consistent hover/focus/disabled states. System font (system font stack), no dependency on external fonts.
- **Mobile-first**: base CSS for small screens and `min-width` media queries. Breakpoints: 640 px, 1024 px.
- **Practical responsiveness**: the table becomes a list of cards on mobile; the form is a single column on mobile and two columns on desktop; compact header; dialogs take the full screen on mobile; touch targets of at least 44 px; no horizontal scroll.
- **Always-visible states**: loading (simple skeleton or spinner), empty (message + action), error (message + retry).
- **Acceptance criteria**: main flows usable and with no layout breakage at 360, 768 and 1280 px widths; visible focus on all interactive elements; adequate contrast. Suggestion: also run a Cypress e2e smoke with a mobile viewport.
- **Out of scope** (to keep it simple): dark mode, elaborate animations, a heavy icon library (use a few inline SVGs), internationalization.

## 11. Extra feature: resilience and scale

**Problem**: under load and transient failures, clients and the database suffer. **For whom**: the product as a whole (operations/SRE and end users, indirectly). **Why**: demonstrate scale and resilience concepts without adding visible functionality.

### 11.1 REST client with retry and exponential backoff (frontend)

Location: `apps/web/src/lib/api/http-client.ts`. Specification:
- `fetch` wrapper with a per-attempt **timeout** (e.g. 10 s, via `AbortController`) and support for external cancellation (no retry after the caller aborts).
- **Retry only when safe**: idempotent methods (GET, PUT, DELETE, HEAD). **POST is not retried** (avoid duplicating a creation).
- **Retry conditions**: network error and status 408, 429, 502, 503, 504. Do not retry validation/business 4xx.
- **Exponential backoff with jitter** (full jitter): base ~300 ms, factor 2, cap ~5 s, max 3 retries (configurable values, with defaults).
- Respect `Retry-After` (429/503) when present, within the cap.
- Typed errors (`ApiError` with `status`, `code`, `details` read from the standardized error envelope).
- Unit tests with fake timers and a mocked `fetch`: success, retry until success, exhaust attempts, do not retry POST/4xx, `Retry-After`, timeout, abort, deterministic jitter via RNG injection.

### 11.2 Singleflight (backend)

Location: `apps/api/src/lib/singleflight.ts`, used in the `service` on **reads** (get product by id, list/search).
- API: `do(key, loader)`; if an in-flight call already exists for the same `key`, the new caller waits on the same Promise; when it finishes (on success **or error**) the key is removed. **No cache** (it does not keep the result after completion).
- Key: derived from the operation + normalized parameters (e.g. `product:42`, `list:{limit,offset,q}`).
- **Never apply it to writes** (POST/PATCH/DELETE).
- Errors propagate to all callers that shared the call.
- The shared result is the same object: treat it as immutable (or clone at the edge).
- Tests: N concurrent callers → loader runs once; different keys do not collapse; shared error; key released after completion; a new call after completion runs again.

### 11.3 Known limitation: singleflight does not coalesce with local SQLite

With SQLite in a local file the query runs on the main thread, so at runtime **there are never two identical queries in flight at the same time** and singleflight coalesces nothing. This holds for `better-sqlite3` (synchronous) **and also for `@libsql/client`**, despite its async API: measured in the scratchpad, 5 requests arriving in distinct event-loop tasks ran the query 5 times (0 coalesced); only calls in the same tick (e.g. `Promise.all` inside a handler) coalesce. Decision: implement the component as a pattern, test it with a simulated async loader and **document this limitation in the README**. Documented next step: a network-accessed database (e.g. PostgreSQL) or running reads in worker threads; only then does singleflight have a real effect. The README must be honest about this.

## 12. Testing strategy

- **Vitest (unit)** in `api`, `web` and `shared`:
  - API: service, mapper (cents ↔ decimal), singleflight, middlewares (validation, error handler), Zod schemas.
  - Web: http-client (retry/backoff), main components (form, list, dialog) with Testing Library.
- **API per route** (Vitest + Supertest with in-memory SQLite): CRUD, pagination (30 default, max. 100), search, 400/404/409/429. *Architect's assumption*: same tool, low cost, asked for by the PDF as "other tests". Confirm (section 15).
- **Cypress (e2e)**: full flow through the UI — list, search, create, edit, delete; against the real server with a temporary DB and seed.
- Goal: cover rules and error paths, not chase a percentage.

## 13. Prioritization and delivery plan

| Priority | Items |
|---|---|
| **P0** | Monorepo + tooling, `shared` schemas, DB + migrations + seed (40+ items), 5 required endpoints with standardized errors, SPA (list, detail, create, edit, delete), unit + e2e tests, `npm start`, README, AI.md |
| **P1** | Extra feature: REST client with retry/backoff, singleflight; rate limit, pino, Zod config, graceful shutdown, `/health` |
| **P2** | PDF optionals: sorting, categories (create/list/list of names/products by category) |

The breakdown into OpenSpec tasks/changes, with scope, acceptance criteria and order, is in **`OPENSPEC_TASKS.md`**.

## 14. Content guide for the final documents

**README.md** must contain: overview; prerequisites (Node LTS); how to run (`npm install`, `npm start`, URL) and how to test; scripts; structure; **product decisions**; **assumptions**; **open questions**; **extra feature** (problem, who uses it, why, and the singleflight limitation with local SQLite); **what was left out and next steps** (auth, helmet, CI, optionals, async driver...).

**AI.md** must contain: narrative of the AI workflow (Q&A planning → OpenSpec → implementation); tools used; what worked well; what worked badly or required correction (e.g. the check that showed singleflight does not coalesce with local SQLite, nor with an async driver; and the `npm install` failure of `better-sqlite3` v13 from the lockfile, which only showed up when actually installing); lessons. Keep the trace of this planning session as evidence.

**Process deliverable**: record the screen of the coding sessions **or** export the full trace of the prompts/agents.

**Product decisions already made** (for the README): partial PATCH; hard delete; `limit/offset` pagination (30/100); substring search on title and description; price in cents internally and decimal in the API; `meta` controlled by the server; unique SKU; category as text; standardized errors; optionals postponed; no authentication.

## 15. Items to confirm / points of attention

1. **GitHub Actions was left out** by the user's decision, but the PDF mentions "Github actions" in the API block ("do your normal thing… Github actions, etc."). Record in the README as a next step, with the list of jobs that would exist (lint, typecheck, unit, e2e). Reassess if time is left.
2. **helmet/restricted CORS** were left out by the user's decision. Considering the request for "security" and that it is cheap (a few lines), reassess; if they stay out, document it.
3. **Route tests with Supertest**: architect's assumption, not explicitly confirmed.
4. **Svelte 5 router library**: validate compatibility in the OpenSpec design.
5. **Build of `shared`/`api` for `npm start`**: define in the design (tsc with project references vs tsup) the simplest that works on Windows and Linux.
6. **Real effect of singleflight**: would require a network database or worker threads; the local async driver is not enough (see 11.3).
7. **Data set size**: defined as 40+ (the PDF does not specify).
