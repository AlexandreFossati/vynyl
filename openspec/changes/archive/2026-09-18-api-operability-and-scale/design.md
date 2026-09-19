# Design

## Context

State after T3: full CRUD, `createApp({ db, logger })`, `server.ts` as the composition root, `AppError` + central error handler, 390 tests. API patterns approved (roadmap). Motivation and scope: `proposal.md`; requirements: `specs/`.

Verified facts (scratchpad, Node 24, `express-rate-limit` 8):

| Fact | Consequence |
|---|---|
| With `standardHeaders: 'draft-7'` the lib sends `RateLimit: limit=2, remaining=1, reset=60` and `RateLimit-Policy: 2;w=60`; when exceeded, `Retry-After: 60` is **already set** when the `handler` runs | the handler only needs to delegate to the central error handler; the header already comes out right |
| A route outside the middleware (`/health`) is not counted | mount `/health` before the limiter, outside `/api` |
| Without `trust proxy`, `X-Forwarded-For` is ignored by the key (socket IP) and the lib wrote no warnings to the console | the default `TRUST_PROXY=0` is safe against spoofing |
| `server.close()` refuses new connections and only finishes after in-flight requests; with a hanging request it does not finish until `closeAllConnections()` | graceful shutdown + maximum time with `closeAllConnections()` |
| On Windows a child process does not receive real `SIGINT`/`SIGTERM` (`kill` only terminates it), but `process.emit('SIGTERM')` calls the registered listeners | the signal wiring is verified in the real process with a trigger that emits the event; signal delivery by the OS is not verifiable here |

## Goals / Non-Goals

**Goals:** request limit, `/health`, clean shutdown and singleflight on reads, all with the layer pattern, DI and tests of T2/T3.
**Non-Goals:** cache, metrics, `helmet`, distributed limit (Redis), authentication, switching drivers.

## Decisions

### D1. Pipeline order in `createApp`
`x-powered-by` off → `trust proxy` (config) → request logger → **`/health`** → limiter on **`/api`** → `express.json()` → `/api/products` → 404 → error handler. `/health` comes after the logger (it is logged and gets `X-Request-Id`) and before the limiter (it is never blocked). `createApp` now receives `settings: { rateLimit: { limit, windowMs }, trustProxy }`, besides `db` and `logger`.

### D2. Rate limit (`middleware/rate-limit.ts`)
`createRateLimiter({ limit, windowMs })` wraps `express-rate-limit` with `standardHeaders: 'draft-7'`, `legacyHeaders: false`, an in-memory store per app instance and a `handler` that calls `next(new AppError('RATE_LIMITED', 'Too many requests, please try again later'))`. The envelope, the 429 status and the `warn`-level log come from the existing pipeline. **Alternative**: respond directly in the lib's handler (discarded: it would duplicate the envelope format). **Limitation**: the in-memory store holds per process (one instance); for several instances a shared store would be needed.

### D3. Health in the layers
`repositories/health.repository.ts` (`ping()` with `select 1`), `services/health.service.ts` (`check()`), `handlers/health.handler.ts` and `routes/health.routes.ts`. The handler catches the failure (it is the exception to the "errors bubble up to the central handler" pattern, because the 503 response does not use the envelope), logs with `req.log.error` and responds `503 { status: 'unavailable' }`; success: `200 { status: 'ok' }`; both with `Cache-Control: no-store`.

### D4. Shutdown (`lib/shutdown.ts`)
`createShutdown({ server, closeDatabase, logger, timeoutMs, exit })` returns `shutdown(signal)`: idempotent (flag), logs the start, arms a forcing timer (`unref`) that calls `server.closeAllConnections()`, logs and exits with 1; otherwise waits for `server.close()`, calls `closeDatabase()`, logs the end and exits with 0; any failure logs and exits with 1. `exit` is injected (testable without killing the process). `registerShutdownSignals(emitter, shutdown)` wires `SIGINT` and `SIGTERM`. The maximum time is the constant `SHUTDOWN_TIMEOUT_MS = 10_000` in `server.ts` (it does not become an environment variable so as not to widen the configuration).

### D5. Singleflight (`lib/singleflight.ts`) and use in the service
`createSingleflight()` returns `{ do(key, loader) }`: if there is an execution in progress for the key, it returns the same promise; otherwise it runs the `loader`, stores the promise and **removes it when it finishes** (success or error) with `promise.then(release, release)` (avoids an unhandled rejection and only removes if the key is still the same). No cache. The service receives `singleflight` (default: a new instance per service, no module singleton) and wraps **only** `list` and `get`, with keys `list:<limit>:<offset>:<q>` and `get:<id>`; `create`, `update` and `remove` never go through it. The shared result is the same object (the handlers only serialize it). **Limitation (measured in T1/T2)**: with local SQLite the query runs on the main thread and requests do not overlap, so at runtime practically nothing is coalesced; the real effect would require a network database or worker threads. The component is tested with simulated async load, the code comments on the limitation and the README (T8) must be honest about it.

### D6. Configuration
`RATE_LIMIT_MAX` (int ≥ 1, default 100), `RATE_LIMIT_WINDOW_MS` (int ≥ 1, default 60000) and `TRUST_PROXY` (int 0–32, default 0), with the same validation pattern as the integers and messages of `loadConfig`. `.env.example` gains the three.

### D7. Tests
Same approved style: pure singleflight with controlled promises; service with a slow *fake* repository; limiter with Supertest and a **fake clock** for the window (no real waits); health with a `:memory:` database and closed client; shutdown with a real HTTP server, real libsql client and fake `exit`; signal wiring with a fake emitter. Runtime verification: real limit with a small `RATE_LIMIT_MAX`, `/health`, and shutdown in the real process triggered by `process.emit`.

## Risks / Trade-offs

- **Singleflight with no real effect today** → documented (D5); do not claim a reduction in queries with this database.
- **In-memory rate limit store** → only one instance; acceptable in this scope.
- **Real signals not verifiable on Windows** → I verify the complete shutdown in the real process via `process.emit` and by tests with a real server; signal delivery by the OS is declared as not verified.
- **Tests with a fake clock** → limited to `Date` and timers; if Supertest interferes, I use a minimal `windowMs` and controlled advance.
- **Misconfigured `TRUST_PROXY`** allows IP spoofing → default 0 and documentation in `.env.example`.

## Migration Plan

No schema change. Rollback: revert the commit.

## Open Questions

None.
