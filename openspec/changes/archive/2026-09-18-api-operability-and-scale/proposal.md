# Proposal

## Why

With the full CRUD (T3), the API needs protection and operability to be considered production-ready and to support the test's **extra feature** (resilience and scale): request limit, health check, clean shutdown and the coalescing of concurrent reads (singleflight), which is the backend counterpart of the REST client with retry/backoff that will come in T5.

## What Changes

- **Rate limit** on `/api` (`express-rate-limit`), per IP, configurable via environment; exceeded → `429 RATE_LIMITED` in the standard envelope with `Retry-After`, plus the `RateLimit` headers. Configurable `trust proxy`.
- **`GET /health`** outside `/api` and the limit: `200` if the database responds, `503` if not.
- **Graceful shutdown** on `SIGINT`/`SIGTERM`: stops accepting connections, completes in-flight requests (with a maximum time), closes the database and exits.
- **Singleflight** (`lib/singleflight.ts`) applied in the service to the **reads** (get by id and list), never to writes, with no cache.
- New environment variables (`RATE_LIMIT_MAX`, `RATE_LIMIT_WINDOW_MS`, `TRUST_PROXY`) and updated `.env.example`.
- **Limitation recorded**: with local SQLite, coalescing has no real effect at runtime (measured in T1); the component is tested with simulated async load and the README (T8) must say so.

**Out of scope**: switching drivers, cache, metrics, `helmet`, authentication, frontend.

## Capabilities

### New Capabilities

- `api-rate-limiting`: per-client request limit on `/api`, `429` response and headers.
- `api-health`: `GET /health` endpoint.
- `graceful-shutdown`: clean shutdown on a system signal.
- `read-coalescing`: coalescing (singleflight) of identical concurrent reads.

### Modified Capabilities

- `api-configuration`: the "Supported environment variables" requirement now includes the three new variables.
- `api-error-handling`: the `RATE_LIMITED` code starts being emitted ("Contract codes and statuses" requirement).

## Impact

- **Code**: `apps/api/src` (config, `lib`, `middleware`, health layers, `app.ts`, `server.ts`, service) and tests. `.env.example`. No new dependencies (`express-rate-limit` is already installed).
- **Observable behavior**: the API starts limiting `/api` (100 requests per minute per IP, by default), exposes `/health` and shuts down cleanly with `Ctrl+C`.
- **Risks**: the in-memory limit holds for a single process; real signals cannot be delivered to a child process on Windows (see `design.md` for how the wiring is verified).
