# Design

## Context

State after T6: `npm run build` already generates `apps/api/dist/server.js` (tsup, with the `shared` package embedded and the other dependencies external) and `apps/web/dist` (Vite); `npm run dev` runs the API and Vite together. `createApp` assembles: log → `/health` → request limit on `/api` → JSON → `/api/products` → 404 → error handler. The repository paths come from where the code is (`getPaths(import.meta.url)`; `dist/server.js` sits three levels below the root, like `src/server.ts`). Guide: section 4 (Express serves the static files and falls back to `index.html` outside `/api`) and section 9 (`npm start`). **There are no e2e tests or Cypress** (user decision).

## Goals / Non-Goals

**Goals:** one command (`npm start`) that builds and serves API and SPA on one port; client routes working on reload; API and `/health` untouched.
**Non-Goals:** e2e/Cypress, CI, Docker, `helmet`/CORS, compression, aggressive caching, `NODE_ENV=production`, README (T8), changes in `apps/web` and `packages/shared`.

## Decisions

### D1. `middleware/spa.ts` middleware, wired through an optional dependency
`createSpaMiddleware({ dir })` returns two handlers: `express.static(dir, { index: false })` and the fallback. It follows the API's pattern (factory function with a dependency by parameter, no singleton). `createApp` gains `spaDir?: string | undefined` in `AppDependencies`; when present, the handlers come in **after** `/api/products` and **before** `notFoundHandler`. Without `spaDir` (existing tests, or SPA not built) nothing changes. `index: false` makes `/` go through the same path as the fallback, so there is a single way of delivering the `index.html`.

### D2. Fallback rule
It responds `res.sendFile(<dir>/index.html)` when **all** the conditions hold: method `GET` or `HEAD`; the path is not `/api` nor starts with `/api/`; it is not `/health` nor starts with `/health/`; and it has no extension (`path.extname` empty). Otherwise it calls `next()` and `notFoundHandler` responds `404` `NOT_FOUND` in JSON. Reasons: an unknown API route never becomes HTML (the SPA's HTTP client expects the error envelope); a nonexistent static file (`/assets/x.js`) must be `404` and not an HTML page with `200` (it would hide a broken build); `POST` outside the API is not an SPA route. The SPA routes have no dot in the path (`/products/7/edit`); is the route `/products/1.5` served as "not found" by the SPA itself? No: it has extension `.5`, so it receives `404` JSON. Accepted: it is an invalid id anyway.

### D3. Static files, security and cache
`express.static` already ignores files with a dot (`dotfiles: 'ignore'`), blocks `..` (including encoded) and lets through methods that are not `GET`/`HEAD`. Caching stays at the default (`ETag` + `max-age=0`, revalidation with `304`): Vite's files have a hash in the name, but it is not worth complicating. Static files stay **outside** the `/api` limiter (which only covers `/api`).

### D4. SPA detection in `server.ts`
`paths` gains `webDistDir` (`<root>/apps/web/dist`). At startup, if `<webDistDir>/index.html` exists, it passes `spaDir` to `createApp`; otherwise it logs `logger.warn('SPA build not found; serving the API only')` and continues with only the API. That way `npm run dev` (Vite serves the SPA) does not require a build and does not break, and `npm start` (which always builds first) serves everything. `server.ts` is the composition root and has no unit test (the pattern since T2); it is verified by really running it (D6).

### D5. `npm start`
Root script: `"start": "npm run build && node apps/api/dist/server.js"`. `&&` works in Windows `cmd`, in PowerShell (via npm) and in POSIX shells, so no extra utility is needed. `npm run build` builds the workspaces in order (`shared` with no build, `api`, `web`); if it fails, the `&&` prevents the server from coming up and the command exits with a non-zero code. The server applies migrations, runs the idempotent seed and listens on `PORT` (default 3000). **`NODE_ENV`** stays at the config default (`development`): setting it would require `cross-env` (a new dependency) and only changes the `env` field of the startup log, so it is recorded as a limitation.

### D6. Tests and verification (no e2e)
- **API tests** (Supertest over `createApp`, with a temporary folder containing `index.html`, `assets/app.js` and a "secret" file outside it; `createTestApp` gains the `spaDir` option): `/` and `/products/7/edit` return the `index.html`; `HEAD` works; `/assets/app.js` is served; nonexistent `/assets/x.js` and `/favicon.ico` → `404` JSON; `/api/does-not-exist` → `404` JSON (not HTML); `/api/products` and `/health` as before; `POST /products/7` → `404` JSON; `%2e%2e` does not deliver the outside file; without `spaDir`, `/` → `404` JSON (current behavior); static files do not consume the `/api` limit. `getPaths` test for `webDistDir`.
- **Real execution**: `npm start` from a checkout with no `dist`, with a temporary database (`DATABASE_PATH`), and a `curl` check of `/`, `/products/7`, an asset referenced by the HTML, a nonexistent asset, `/api/products`, `/api/nada`, `/health`; then the server without `apps/web/dist` (warning in the log, `/` → `404`); and a **clean clone** (`git clone` in a short path, `npm ci`, `npm start`) for the "clean clone → `npm install` + `npm start`" criterion. There is no browser in this verification: the rendering of the production bundle is left for the user to open and check.

## Risks / Trade-offs

- **The bundle depends on the repository** (migrations, dataset and `apps/web/dist` are read by a path relative to the code) → this is how it already worked; `npm start` runs from inside the clone.
- **`npm start` builds every time** (a few seconds) → simple and always consistent with the code, instead of a build cache that may go stale.
- **No browser test of the production bundle** → the same code was already exercised on Vite in a real browser (T5/T6); what changes here is only the delivery of the files, covered by route tests and `curl`. The visual check is the user's.
- **`/products/1.5` receives `404` JSON** (it has an "extension") instead of the SPA's "not found" page → acceptable.

## Migration Plan

No migration. Rollback: revert the commit.

## Open Questions

None.
