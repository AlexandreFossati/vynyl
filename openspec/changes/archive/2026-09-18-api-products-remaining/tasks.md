# Tasks

> References: specs in `specs/` (`product-management-api`, `api-error-handling`); decisions in `design.md` (D1–D7); approved patterns in `OPENSPEC_TASKS.md`. Language: code, comments and tests in **English**; these tasks in Portuguese. Do not commit (the orchestration does it afterward). **No new dependency.** Verification temporaries go in the scratchpad. Tests follow the Definition of Done in `CLAUDE.md`.

## 1. Contracts and mapper

- [x] 1.1 Create in `packages/shared/src/product-input.ts` `createProductInputSchema`, `updateProductInputSchema` (partial, at least one field) and `productIdParamsSchema`, with types, export in `index.ts` and test: creation accepts a valid body and rejects `id`, `meta`, an unknown key and each violated field rule; update accepts one field, rejects `{}`, `id`, `meta` and an unknown key; `id` accepts `1` and `42` and rejects `abc`, `0`, `-1`, `1.5`, `1e2`, empty and a repeated value. Verify with `npm test -w @vynyl/shared` and `npm run typecheck`.
- [x] 1.2 Add to `apps/api/src/mappers/product.mapper.ts` `toProductCreate(input, now)` and `toProductPatch(patch, now)` and test: price `19.99`, `0.29`, `4.35` become 1999, 29 and 435 cents; `toProductPatch` includes only the keys received and always `updatedAt`; `createdAt` never appears in the patch. Verify with `npm test -w @vynyl/api`.

## 2. Repository and service

- [x] 2.1 Add to the repository `findById`, `create`, `update`, `remove` and `DuplicateSkuError` (D2), with tests on a `:memory:` database: `findById` finds and does not find; `create` returns the row with a generated `id` greater than the largest existing one; `create` with an existing `sku` throws `DuplicateSkuError` and does not change the table; `update` changes only the fields sent, returns the row, keeps `createdAt`, allows keeping its own `sku`, throws `DuplicateSkuError` for another product's `sku` and returns `undefined` for a nonexistent `id`; `remove` returns `true` and then `false`; errors that are not about SKU bubble up intact (closed database). Verify with the `api` tests.
- [x] 2.2 Add to the service `get`, `create`, `update` and `remove` with injected `now` (D3) and test with a *fake* repository and fixed clock: `get` nonexistent throws `PRODUCT_NOT_FOUND`; `create` writes `createdAt` and `updatedAt` equal to the clock and returns the DTO with a decimal price; `DuplicateSkuError` becomes `SKU_CONFLICT` (409) with the cause preserved; `update` nonexistent throws `PRODUCT_NOT_FOUND`, updates only `updatedAt` besides the fields and does not touch `createdAt`; `remove` nonexistent throws `PRODUCT_NOT_FOUND`; other errors propagate unchanged. Verify with the `api` tests.

## 3. HTTP

- [x] 3.1 Add to the handler `get`, `create` (`201` + `Location`), `update` and `remove` (`204`), and the routes `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` with the corresponding `validate` (D5). Test with a *fake* service: each handler uses the values from `res.locals.validated`, responds with the expected status, `create` sends `Location: /api/products/<id>`, `remove` has no body and service failures reach the error handler; the route validates before the handler (invalid id and invalid body do not call the handler). Verify with the `api` tests.
- [x] 3.2 Add `express.json()` to `app.ts` before the routes and the mapping of `body-parser` errors in the `error-handler` (D6), with tests: malformed JSON, `null` and a body above 100 kb → `400 VALIDATION_ERROR` with fixed messages and no parser text; empty body with `application/json`, `text/plain` and array → `400` from validation; errors that are not from the parser continue as before. Verify with the `api` tests.

## 4. End-to-end routes

- [x] 4.1 Route tests via `createTestApp` (real data set) covering **all the scenarios** of the `product-management-api` spec and of the modified `api-error-handling` requirement: get existing and nonexistent; the invalid identifiers on GET, PATCH and DELETE; create (201, `Location`, `id` greater than the largest existing one, `meta` equal in both timestamps, retrievable afterwards, price `19.99`); server-controlled, invalid, missing fields, empty/array/non-JSON body; duplicate SKU on creation and on update (catalog and product unchanged) and update with its own SKU; PATCH of one field (others equal, `createdAt` equal, `updatedAt` later), `{}`, `id`/`meta`/unknown/invalid, nonexistent; DELETE (204 with no body, next GET 404, repetition 404); listing `total` ±1; 409 and 404 in the error envelope. Verify with `npm test -w @vynyl/api` and list the scenario→test mapping in the report.

## 5. Runtime verification

- [x] 5.1 Start the development server (`tsx`) with a temporary database and really exercise: `POST` (201 + `Location`), `GET` on the `Location`, `PATCH`, `DELETE` (204) and the next `GET` (404), duplicate SKU (409), malformed JSON (400), invalid id (400), and `GET /api/products` with a coherent `total`; restart the server over the same database and verify that the created product remains and the removed one does not come back, and that the next `id` does not reuse the removed one. Repeat the essentials with the bundle (`npm run build -w @vynyl/api` + `node apps/api/dist/server.js`). Show real results and clean up temporary files.

## 6. Closing

- [x] 6.1 Run at the root `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` and `npm run format` (twice, idempotent); check the scope (`package.json`/lockfile unchanged, no `console.*`/TODO, no T4 code such as rate limit, `/health`, shutdown, singleflight; no temporary files); run `openspec validate api-products-remaining --strict`; reflect in `OPENSPEC_TASKS.md` only the scope and acceptance items of T3 actually verified (without checking the Overall status or "Closing"); deliver the final report with the scenario→test mapping and what was not verified.
