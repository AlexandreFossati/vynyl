# Proposal

## Why

T2 delivered the listing and the backend foundation. What remains are the PDF's other required endpoints: get a product, create, update and remove. With the API pattern approved, T3 implements them by **replicating** that pattern (layers, validation, errors, tests), without inventing a second way of doing things.

## What Changes

- `GET /api/products/:id`, `POST /api/products`, `PATCH /api/products/:id` (partial update) and `DELETE /api/products/:id` (permanent removal).
- **`packages/shared`**: create and update schemas derived from `productSchema` (`omit`/`partial`) and the `id` parameter schema.
- **Layers**: repository (`findById`, `create`, `update`, `remove`, with a domain error for duplicate SKU), service (404 and 409 rules, date timestamps from the injected clock), handler and routes; new functions in the mapper (price in cents without floating-point error).
- **SKU uniqueness guaranteed by the database constraint**, translated into a domain error (no "check then insert").
- **JSON parser** (`express.json`, default limit of 100 kb) and mapping of its errors (malformed or too-large JSON) to `VALIDATION_ERROR`.
- Tests per layer and per route.

**Out of scope**: rate limit, `/health`, graceful shutdown and singleflight (T4); frontend (T5 onward); sorting and categories (T9); authentication.

## Capabilities

### New Capabilities

- `product-management-api`: HTTP contract for getting, creating, updating and removing a product: identifier, body rules, server-controlled fields, unique SKU and responses.

### Modified Capabilities

- `api-error-handling`: the codes `PRODUCT_NOT_FOUND` and `SKU_CONFLICT` start being emitted ("Contract codes and statuses" requirement), and there is a new requirement for a malformed or too-large request body.

## Impact

- **Code**: `packages/shared/src`, `apps/api/src` (mapper, repository, service, handler, routes, error handler, `app.ts`) and tests. No change to the database schema or dependencies.
- **Observable behavior**: the API starts accepting writes on `/api/products`. `data/app.db` stops being read-only; deleted products do not come back on restart while the table has at least one product (the seed rule).
- **Risks**: mapping the constraint error depends on the driver's error format (verified); a too-large body (`body-parser`'s 413) is answered as 400 `VALIDATION_ERROR` to respect the code contract.
