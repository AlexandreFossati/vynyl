# Tasks

> References: specs in `specs/` (`web-design-foundation`, `web-http-client`, `product-dashboard`, `web-app-structure`); decisions in `design.md` (D1–D10); UI rules in the guide (sections 10 and 11.1). Language: code, comments, interface texts and tests in **English**; these tasks in Portuguese. **Do not commit or archive** (the user reviews first). **No new dependency.** Verification temporaries in the scratchpad. Tests follow the Definition of Done in `CLAUDE.md`.

## 1. Visual foundation and proxy

- [x] 1.1 Create `apps/web/src/styles/tokens.css` and `base.css` (D7) and import them once in `main.ts`; test `styles/tokens.test.ts` that reads `tokens.css` and verifies the WCAG contrast ratio (>= 4.5:1 for the text pairs, >= 3:1 for the focus ring). Verify with the `web` tests.
- [x] 1.2 Configure the `/api` → `http://localhost:3000` proxy in `vite.config.ts` (D-spec `web-app-structure`). Verify in 8.1 with the real API.

## 2. REST client

- [x] 2.1 Create `lib/api/api-error.ts` and `lib/api/http-client.ts` (D3) with tests (fake timers, fake `fetch`, injected `random`): query and JSON body, `204`, error envelope, response without envelope, network failure, `INVALID_RESPONSE`, timeout, abort during the request and during the backoff, retry until success, attempts exhausted, `POST`/`PATCH` without retry, `400`/`404` without retry, `Retry-After` (seconds, date, above the cap), backoff 300/600/1200 ms with `random = 1`, cap, jitter with `random = 0.5`. Verify with the `web` tests.
- [x] 2.2 Create `lib/api/products-api.ts` (D4) with tests: parameters sent (with and without `q`), signal forwarded, valid response, response outside the contract → `INVALID_RESPONSE`. Verify with the `web` tests.

## 3. Routing and component boundary

- [x] 3.1 Create `lib/router.svelte.ts` (D1) and the `lib/api` boundary lint rule (D8) in `eslint.config.js`. Actually verify the rule: a temporary violation in an atom must fail `npm run lint` and an import in `pages` must pass; remove the violation. The router tests are in task 7.1 (via `App`).

## 4. Atoms

- [x] 4.1 Create `Button`, `Input`, `Badge` and `Spinner` in `components/atoms` (D2, D7): only props/events and tokens; minimum height of 44 px in `Button` and `Input`; `Spinner` with `role="status"`/accessible label or marked as decorative depending on the use. Rendering and event tests for `Button` and `Input`. Verify with the `web` tests and `typecheck`.

## 5. Molecules

- [x] 5.1 Create `SearchBox` (300 ms debounce, D6), `Pagination`, `PriceTag`, `StockBadge` and `StatusMessage` in `components/molecules`, with tests: `SearchBox` (one call after the pause, none before, full text, `maxlength`), `Pagination` (displayed range, disabled limits, callbacks, empty catalog), `StockBadge` (0, 1, 10, 11), `PriceTag` (`$1,299.00`, `$9.99`), `StatusMessage` (`alert` role on danger, action called, `busy` shows the spinner). Verify with the `web` tests.

## 6. Organisms and template

- [x] 6.1 Create `Header` and `ProductList` in `components/organisms` and `AppShell` in `components/templates` (D2, D7), with `ProductList` tests: a table row and a card per product with title, brand, formatted category, price and stock badge; table caption and headers; `aria-busy` when `busy`. Verify with the `web` tests and `typecheck`.

## 7. Pages and application

- [x] 7.1 Create `DashboardPage` and `NotFoundPage` in `components/pages` (D5) and wire `App.svelte` to the router and `AppShell`, with tests: `DashboardPage` with a fake `api` (first page with `limit=30&offset=0` without `q`; search generates a single request with the text and `offset=0`; `Next` asks for `offset=30`; empty search omits `q`; empty with "Clear search"; error with "Try again"; out-of-order responses; reload keeps the list with `aria-busy`); `App` (`/` shows the dashboard, unknown path shows not-found, "Back to products" navigates without reloading, `popstate`). Verify with the `web` tests and `typecheck`.

## 8. Verification and closing

- [x] 8.1 Verification in a real browser (D10): real API with a temporary database + Vite with proxy + temporary Cypress spec in the scratchpad, at 360, 768 and 1280 px: lists the 44 real products in 2 pages (30 + 14), debounced search (one request per fast typing), pagination, no horizontal scroll, correct presentation (cards on mobile, table from 640, brand and SKU from 1024), visible focus, empty state and error state (API stopped); read the screenshots. State what was not verifiable.
- [x] 8.2 Run at the root `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run format` (twice, idempotent); check the scope (`package.json`/lockfile unchanged, no `console.*`/TODO, no literal colors in the components, no component below `pages` imports `lib/api`, no temporaries); `openspec validate web-foundation-dashboard --strict`; reflect in `OPENSPEC_TASKS.md` only the scope and acceptance items of T5 actually verified (leave "User review", "Frontend patterns" and "Commit done" open); deliver the report with what was **not** verified. **Stop before the commit.**
