# Proposal

## Why

The API and SPA are ready (T1–T6), but today they only run in development mode, with two processes and two ports. The statement requires that the evaluator clones the repository, follows short instructions and reaches a working page. T7 delivers that: one command (`npm start`) that builds everything and brings up **one** server, at `http://localhost:3000`, serving the API and the SPA.

**User decision (2026-09-18): there will be no e2e tests or Cypress.** T7's original scope (Cypress, mobile smoke, `test:e2e`) was dropped; T7 is left with only serving the SPA and `npm start`. What e2e ceases to exist will be listed in the README as not done. The Cypress files and dependency stay as they are.

## What Changes

- **Serve the SPA through Express**: the files in `apps/web/dist` are served as static files and any `GET`/`HEAD` of a path with no extension that is neither the API nor `/health` receives the `index.html` (fallback for the SPA routes, such as `/products/7`). A request for a nonexistent file (with an extension) and any route under `/api` keep responding `404` `NOT_FOUND` in JSON.
- **Without an SPA build, only the API**: if `apps/web/dist/index.html` does not exist, the server comes up anyway, with only the API, and warns in the log (this is the case for `npm run dev`, where the SPA comes from Vite).
- **`npm start`** at the root: `npm run build && node apps/api/dist/server.js`. It builds the API and the SPA, applies the migrations, runs the idempotent seed and brings up the server on port 3000. No shell-specific syntax.
- **`npm run dev`** already exists (API with reload + Vite with proxy) and does not change.

**Out of scope**: any e2e or Cypress test (dropped), CI, Docker, `helmet`/CORS, aggressive asset caching, compression, `NODE_ENV=production` in `start` (would require `cross-env`, a new dependency), final README (T8).

## Capabilities

### New Capabilities

- `spa-serving`: the server delivers the built SPA and the client routes' fallback, without interfering with the API or `/health`.

### Modified Capabilities

- `api-error-handling`: "Nonexistent route" now distinguishes the API (always `404` JSON) from the rest, which receives the SPA when it is built.
- `monorepo-workspace`: the root scripts now include `start`.

## Impact

- **Code**: `apps/api` (`config/paths.ts`, `app.ts`, a new `spa.ts` middleware, `server.ts`), root `package.json` (`start` script). No change to `apps/web` or `packages/shared`. **No new dependencies** (`express.static` and `res.sendFile` already come with Express).
- **Observable behavior**: at `http://localhost:3000`, `/` and `/products/7` open the SPA; `/api/...` and `/health` remain as before.
- **Risks**: the API bundle only works when run from inside the repository (paths derived from where the code is, as it already was); the rendering of the SPA's production bundle in a browser is checked manually by the user, since there is no browser test.
