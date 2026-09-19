# Design

## Context

State after T2 (commits `0b3f3bb` and `110fc6a`): API with `GET /api/products`, `routes → handlers → services → repositories` layers (+ `mappers`), factories with injection by parameter, `validate` with the result in `res.locals`, `AppError` + central `error-handler`, allowlist logs and 258 tests. The **patterns are approved** (`OPENSPEC_TASKS.md`, "Approved patterns → API"); this task replicates them without variation. Motivation and scope: `proposal.md`; requirements: `specs/`.

Verified facts (scratchpad):

| Fact | Consequence |
|---|---|
| A duplicate `sku` arrives as a generic Drizzle `Error` (`Failed query: ...`) whose `cause` is a `LibsqlError` with `code: SQLITE_CONSTRAINT`, `rawCode: 2067` and message `UNIQUE constraint failed: products.sku` (on `insert` and `update`) | the repository detects the conflict by inspecting the `cause`, not the outer error's message |
| `insert/update/delete ... returning()` work; `update` and `delete` of a nonexistent `id` return `[]` | a single command returns the result and signals "not found" (no prior `select`) |
| Updating keeping its own `sku` does not conflict | there is no need to handle that case |
| Zod 4's `omit` and `partial` preserve strict mode | `id`, `meta` and unknown keys are rejected with no extra code |
| `body-parser` errors carry `type` (`entity.parse.failed` with status 400, `entity.too.large` with 413); `null` also becomes `entity.parse.failed`; an empty body with `application/json` becomes `{}`; `text/plain` leaves `req.body` undefined | map by `type`; the rest falls into normal validation (400) |

## Goals / Non-Goals

**Goals:** complete the required endpoints with the same pattern as T2, guaranteeing SKU uniqueness by the database and responses consistent with the specs.

**Non-Goals:** rate limit, `/health`, shutdown, singleflight (T4); sorting and categories (T9); a new way of validating, logging or handling errors.

## Decisions

### D1. Contracts in `packages/shared`
`createProductInputSchema = productSchema.omit({ id: true, meta: true })`; `updateProductInputSchema = createProductInputSchema.partial().refine(at least one key)`; `productIdParamsSchema = z.strictObject({ id })` with the same pattern as the query integers (`^\d+$` → number, safe and `>= 1`). Types via `z.infer`. No field rule is duplicated.

### D2. Repository: domain error for duplicate SKU
New methods: `findById(id)`, `create(row)`, `update(id, patch)` and `remove(id)`, all with `returning()`; `findById`/`update`/`remove` return `undefined`/`false` when there is no row. `create` and `update` translate the constraint error into `DuplicateSkuError` (a domain class, no HTTP) by inspecting `error.cause` (`code === 'SQLITE_CONSTRAINT'` and a message with `products.sku`); any other error bubbles up intact. **No "check then insert"**: the database constraint is the source of truth and avoids the race condition.

### D3. Service: 404, 409 and injected clock
`createProductsService({ productsRepository, now = () => new Date() })`. `get`/`update`/`remove` throw `AppError('PRODUCT_NOT_FOUND')` when there is no row; `DuplicateSkuError` becomes `AppError('SKU_CONFLICT', ..., { cause })`. `create` writes `createdAt = updatedAt = now()`; `update` writes only `updatedAt = now()` (even if the values do not change). The injected clock makes the tests deterministic and keeps the date out of the repository. Timestamps follow the ISO 8601 UTC format with ms (`toISOString()`).

### D4. Mapper
New pure functions: `toProductCreate(input, now)` (price → cents with `Math.round`) and `toProductPatch(patch, now)` (only the present keys; `price` → `priceCents`). The existing `toProduct` remains the only output to the DTO.

### D5. Handler and routes
Handler: `get`, `create` (`201` + `res.location('/api/products/<id>')`), `update` (`200`) and `remove` (`204`, no body). Routes: `GET /:id` (`validate params`), `POST /` (`validate body`), `PATCH /:id` (`validate params + body`) and `DELETE /:id` (`validate params`). No logic in the routes.

### D6. JSON parser and mapping of its errors
`app.use(express.json())` (default limit of 100 kb) before the routes. The `error-handler` recognizes `body-parser` errors by `type` and responds to them as `400 VALIDATION_ERROR` with fixed messages (`Malformed JSON body` / `Request body too large`), without passing on the parser's text. `entity.too.large` (native 413) becomes 400 because the contract only defines `VALIDATION_ERROR` for invalid input; adding a new code would change the shared contract with no gain for this project.

### D7. Tests
Same style as T2: repository with `:memory:`, service with a *fake* repository and fixed clock, handler/routes with fakes, and end-to-end routes with `createTestApp`. Each spec scenario maps to at least one test.

## Risks / Trade-offs

- **Driver error format** → detection isolated in one function with tests against the real database; if the driver changes, the duplicate SKU test fails.
- **413 answered as 400** → recorded here and in the spec; the client still receives a clear error.
- **`PATCH` always updates `updatedAt`**, even with no change in values → simple and predictable.
- **Removed products do not come back on restart** only while at least one product remains (the seed rule: it only seeds with an empty table). If all are removed, the restart seeds again.
- **New `id` after `DELETE`** keeps growing (`AUTOINCREMENT`), never reuses ids.

## Migration Plan

Does not apply (no schema change). Rollback: revert the task's commit.

## Open Questions

None.
