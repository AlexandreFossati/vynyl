# Tasks

> References: specs in `specs/` (`spa-serving`, `api-error-handling`, `monorepo-workspace`); decisions in `design.md` (D1–D6); guide sections 4 and 9. Language: code, comments, log messages and tests in **English**; these tasks in Portuguese. **No e2e and no Cypress** (user decision); the Cypress files stay as they are. **No new dependency**, no change in `apps/web` or `packages/shared`. Follow the API's "Approved patterns" (factory with a dependency by parameter, tests with Supertest over `createApp`). Temporaries in the scratchpad. Tests follow the Definition of Done in `CLAUDE.md`.

## 1. Serve the SPA in the API

- [x] 1.1 Add `webDistDir` to `config/paths.ts` (with a test in `paths.test.ts`) and create `middleware/spa.ts` (D1–D3) wired in `createApp` through an optional `spaDir`, and the `spaDir` option in `createTestApp`. Verify with the new tests in `app.spa.test.ts` (D6 matrix: `/`, client route, `HEAD`, existing and nonexistent asset, `/api/nada` in JSON, `/api/products` and `/health` intact, `POST` outside the API, `%2e%2e`, without `spaDir`, `/api` limit not consumed) and with the existing API tests, which keep passing.
- [x] 1.2 Wire `server.ts` (D4): pass `spaDir` when `apps/web/dist/index.html` exists and warn in the log when it does not. Verify with `typecheck` and lint (`server.ts` has no unit test, D4).

## 2. `npm start`

- [x] 2.1 Add the `start` script to the root (D5). Verify by running `npm start` from a checkout with no `dist`, with a temporary database: the build passes, the log shows "API listening" and the D6 `curl` matrix responds as expected (`/`, `/products/7`, an asset from the HTML, nonexistent asset, `/api/products`, `/api/nada`, `/health`); then with `apps/web/dist` removed (warning in the log, `/` → `404`); and a broken build (no need to really break it: check that the `&&` prevents the server, by reading the script).

## 3. Verification and closing

- [x] 3.1 Clean clone: `git clone` of the repository (with the changes from tasks 1–2 copied over, since not yet committed) to a short path, `npm ci`, `npm start` with a temporary database and the same D6 `curl`; stop the server and delete the clone. State what was not verifiable (browser with the production bundle).
- [x] 3.2 Run at the root `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run format` (twice, idempotent); check the scope (`apps/web`, `packages/shared` and the lockfile unchanged; no `console.*`/TODO; no temporaries; `data/app.db` untouched); `openspec validate spa-serving-and-start --strict`; reflect in `OPENSPEC_TASKS.md` only the T7 items actually verified (the Cypress items are already marked as dropped); deliver the report with what was **not** verified.
