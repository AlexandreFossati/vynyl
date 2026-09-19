# Tasks

> References: specs in `specs/` (`api-rate-limiting`, `api-health`, `graceful-shutdown`, `read-coalescing` and the modified `api-configuration`, `api-error-handling`); decisions in `design.md` (D1–D7); approved patterns in `OPENSPEC_TASKS.md`. Language: code, comments and tests in **English**; these tasks in Portuguese. Do not commit (the orchestration does it afterward). **No new dependency.** Verification temporaries in the scratchpad. Tests follow the Definition of Done in `CLAUDE.md`.

## 1. Configuration

- [x] 1.1 Add `RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS` and `TRUST_PROXY` to `config/env.ts` (D6) and to `.env.example`, with tests: defaults (100, 60000, 0), values provided, `RATE_LIMIT_MAX` `0`/`abc`, `RATE_LIMIT_WINDOW_MS` `0`/`abc`, `TRUST_PROXY` `-1`/`99`/`abc`, and the message lists all the invalid ones with the reason. Verify with `npm test -w @vynyl/api`.

## 2. Singleflight

- [x] 2.1 Create `apps/api/src/lib/singleflight.ts` (D5) with tests using controlled promises: N simultaneous calls with the same key run the `loader` once and receive the same result; different keys each run; after finishing, a new call runs again (no cache); error shared by all and key released (the next one runs and may succeed); a `loader` that throws synchronously becomes a rejection and releases the key; no unhandled rejection. Verify with the `api` tests.
- [x] 2.2 Inject `singleflight` into the service and wrap only `list` and `get` (D5), with tests using a slow fake repository: 5 simultaneous identical `list`s call the repository once; `list` with different `q`, `limit` or `offset` and `get` with different `id`s do not collapse; simultaneous `get` coalesces; two simultaneous `create`s call the repository twice, and `update`/`remove` likewise; a repository failure reaches everyone and the next call tries again; the existing tests keep passing. Verify with the `api` tests and `typecheck`.

## 3. Rate limit

- [x] 3.1 Create `apps/api/src/middleware/rate-limit.ts` (D2) and wire it in `createApp` with `settings` (D1), with tests via Supertest and a fake clock: within the limit responses carry `RateLimit` and `RateLimit-Policy`; when exceeded, `429` with the `RATE_LIMITED` envelope, an integer `Retry-After` > 0 and the operation does not run (a blocked `POST` does not create a product); after advancing the window the client is served again; nonexistent routes under `/api` count; a varying `X-Forwarded-For` is ignored by default (still `429`); with `TRUST_PROXY=1` distinct IPs are counted separately. Verify with the `api` tests.

## 4. Health

- [x] 4.1 Create the health layers (`repositories/health.repository.ts`, `services/health.service.ts`, `handlers/health.handler.ts`, `routes/health.routes.ts`) and mount `/health` before the limiter (D1, D3), with tests: `200 {status:'ok'}` with `Cache-Control: no-store`; `503 {status:'unavailable'}` with the `client` closed, no error text in the body and with the error in the log and the same `X-Request-Id`; `/health` keeps responding while `/api` is blocked by the limit; `POST /health` responds `404`. Verify with the `api` tests.

## 5. Shutdown

- [x] 5.1 Create `apps/api/src/lib/shutdown.ts` (`createShutdown`, `registerShutdownSignals`, D4) with tests using a real HTTP server, real libsql client and fake `exit`: a slow in-flight request finishes with the complete response and only then the database closes and `exit(0)`; a new connection after the start is refused; an idle server exits quickly with 0; a request that never finishes + fake `setTimeout` clock advanced beyond the maximum time → `closeAllConnections`, forcing log and `exit(1)`; second call ignored; a failure to close logs and exits with 1; a fake emitter emits `SIGINT` and `SIGTERM` and each triggers `shutdown` (only once). Verify with the `api` tests.
- [x] 5.2 Wire everything in `apps/api/src/server.ts`: pass `settings` to `createApp` (config), keep the `client`, create the `shutdown` with `SHUTDOWN_TIMEOUT_MS = 10_000` and register `SIGINT`/`SIGTERM`. Verify with `npm run typecheck`, `npm run lint` and `npm test`.

## 6. Runtime verification

- [x] 6.1 With the real server (`tsx`, temporary database, `RATE_LIMIT_MAX=5`, `RATE_LIMIT_WINDOW_MS=4000`): 5 requests `200` with `RateLimit` headers, the 6th `429` `RATE_LIMITED` with `Retry-After`, `/health` `200` during the block, and after the window `200` again; a varying `X-Forwarded-For` does not escape the limit; defaults (no variables) show `RateLimit-Policy: 100;w=60`. Repeat the essentials with the bundle.
- [x] 6.2 Shutdown in the real process: start the server with a trigger that emits `process.emit('SIGTERM')` (`node --import <trigger> dist/server.js`, in the scratchpad) while a request is in flight; verify that the response arrives, the logs record start and end, the port is free and the exit code is 0; repeat with `SIGINT`. State that signal delivery by the OS on Windows was not verified.

## 7. Closing

- [x] 7.1 Run at the root `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run format` (twice, idempotent); check the scope (`package.json`/lockfile unchanged, no `console.*`/TODO, no cache or frontend code, no temporaries); `openspec validate api-operability-and-scale --strict`; reflect in `OPENSPEC_TASKS.md` only the scope and acceptance items of T4 actually verified; deliver the report with what was **not** verified.
