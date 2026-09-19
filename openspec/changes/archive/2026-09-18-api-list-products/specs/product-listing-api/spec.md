# Spec Delta

## Purpose

Define the HTTP contract of the product listing, with pagination and search, consumed by the SPA and any other API client. It is the catalog's first endpoint and serves as a model for the others.

## ADDED Requirements

### Requirement: Default paginated listing
`GET /api/products` without parameters SHALL respond `200` with a JSON object `{ data, total, limit, offset }`. `data` is an array of products ordered by ascending `id`, with at most `limit` items. `limit` defaults to **30** and `offset` defaults to **0** when omitted. `total` is the number of products that satisfy the search, regardless of pagination.

#### Scenario: Default listing with the initial catalog
- **WHEN** a client calls `GET /api/products` and the catalog contains the data set's 44 products
- **THEN** the response is `200`, `data` has 30 products with `id` from 1 to 30 in ascending order, `total` is 44, `limit` is 30 and `offset` is 0

#### Scenario: Empty catalog
- **WHEN** a client calls `GET /api/products` and there are no registered products
- **THEN** the response is `200` with `data` equal to `[]`, `total` equal to 0, `limit` equal to 30 and `offset` equal to 0

### Requirement: Product representation
Each item in `data` SHALL contain exactly the fields `id`, `title`, `description`, `category`, `price`, `stock`, `brand`, `sku`, `weight` and `meta`, where `meta` contains `createdAt` and `updatedAt` as ISO 8601 UTC text. `price` SHALL be a decimal number in monetary units (for example, `9.99`), not in cents. No internal storage detail (such as column names or values in cents) SHALL be exposed.

#### Scenario: Product from the statement
- **WHEN** a client calls `GET /api/products` and locates the product with `id` 1
- **THEN** it is `{ id: 1, title: "Large Flux Capacitor", category: "automotive", price: 9.99, stock: 42, brand: "ACME", sku: "ACM-FC-001", weight: 4, meta: { createdAt: "2025-04-30T09:41:02.053Z", updatedAt: "2025-04-30T09:41:02.053Z" } }` accompanied by `description`, with no additional field

#### Scenario: Price in monetary units
- **WHEN** a product is stored with 1999 cents
- **THEN** the response exposes `price` equal to `19.99`

### Requirement: Pagination by limit and offset
The `limit` parameter SHALL be an integer between 1 and 100 and `offset` an integer greater than or equal to 0. The response SHALL echo the values actually applied. Consecutive pages SHALL NOT repeat or omit products, and `total` SHALL be the same on all pages of the same search. An `offset` beyond the end of the result SHALL produce `200` with empty `data`.

#### Scenario: Second page
- **WHEN** a client calls `GET /api/products?limit=10&offset=10` with 44 registered products
- **THEN** `data` contains the products with `id` 11 to 20, `total` is 44, `limit` is 10 and `offset` is 10

#### Scenario: Partial last page
- **WHEN** a client calls `GET /api/products?offset=30` with 44 registered products
- **THEN** `data` contains 14 products (`id` from 31 to 44) and `total` is 44

#### Scenario: Maximum limit
- **WHEN** a client calls `GET /api/products?limit=100` with 44 registered products
- **THEN** `data` contains all 44 products and `limit` is 100

#### Scenario: Offset beyond the end
- **WHEN** a client calls `GET /api/products?offset=1000` with 44 registered products
- **THEN** the response is `200` with `data` equal to `[]`, `total` equal to 44 and `offset` equal to 1000

### Requirement: Validation of query parameters
Invalid parameters SHALL be rejected with `400` and code `VALIDATION_ERROR`, without being silently corrected or truncated. Invalid are: `limit` outside 1–100 or that is not a plain decimal integer (digits only: `abc`, `1.5`, `-1`, `1e2`, `+5`, an empty value or one with spaces are rejected); `offset` negative or that is not a plain decimal integer; any repeated parameter; any unknown parameter; and `q` with more than 100 characters. The error SHALL identify the problematic parameter in `details`.

#### Scenario: Zero limit
- **WHEN** a client calls `GET /api/products?limit=0`
- **THEN** the response is `400` with `error.code` equal to `VALIDATION_ERROR` and `error.details` pointing to `limit`

#### Scenario: Limit above the maximum
- **WHEN** a client calls `GET /api/products?limit=101`
- **THEN** the response is `400` with `error.code` equal to `VALIDATION_ERROR` and no data is returned

#### Scenario: Values that are not plain integers
- **WHEN** a client sends `limit=abc`, `limit=1.5`, `limit=1e2`, `limit=+5`, `limit=` or `offset=-1`
- **THEN** each request receives `400` with `error.code` equal to `VALIDATION_ERROR`

#### Scenario: Repeated parameter
- **WHEN** a client calls `GET /api/products?limit=10&limit=20`
- **THEN** the response is `400` with `error.code` equal to `VALIDATION_ERROR`

#### Scenario: Unknown parameter
- **WHEN** a client calls `GET /api/products?foo=1`
- **THEN** the response is `400` with `error.code` equal to `VALIDATION_ERROR`

#### Scenario: Search term too long
- **WHEN** a client calls `GET /api/products` with a 101-character `q`
- **THEN** the response is `400` with `error.code` equal to `VALIDATION_ERROR` and `error.details` pointing to `q`

### Requirement: Text search
The optional `q` parameter SHALL filter the products whose `title` **or** `description` contains `q` as a substring, case-insensitively for ASCII letters. `q` SHALL be trimmed at the ends; an empty or whitespace-only `q` SHALL be equivalent to no search. The characters `%`, `_` and `\` SHALL be treated literally, never as wildcards. The search SHALL combine with `limit` and `offset`, and `total` SHALL reflect only the products found.

#### Scenario: Case-insensitive search
- **WHEN** a client calls `GET /api/products?q=flux` and then `GET /api/products?q=FLUX`
- **THEN** both responses have the same `total` and the same products, all with "flux" (in any case) in the title or description

#### Scenario: Match only in the description
- **WHEN** there is a product whose title does not contain the term, but whose description does, and a client searches for that term
- **THEN** that product is present in the result

#### Scenario: Search combined with pagination
- **WHEN** a client calls `GET /api/products?q=flux&limit=5&offset=5`
- **THEN** `data` contains up to 5 products from the second page of the search results, and `total` is the total number of matches

#### Scenario: Search with no results
- **WHEN** a client searches for a term that no product contains
- **THEN** the response is `200` with `data` equal to `[]` and `total` equal to 0

#### Scenario: LIKE wildcards are literal
- **WHEN** a client calls `GET /api/products?q=%25` (the `%` character) and no product contains `%` in the title or description
- **THEN** the response is `200` with `data` equal to `[]` and `total` equal to 0, not the whole catalog

#### Scenario: Literal underscore character
- **WHEN** there are products whose title contains `_` and others that do not, and a client searches for `_`
- **THEN** only the products that contain the `_` character are returned

#### Scenario: Empty or whitespace-only term
- **WHEN** a client calls `GET /api/products?q=%20%20`
- **THEN** the response is identical to that of `GET /api/products` without `q`

#### Scenario: Term with spaces at the ends
- **WHEN** a client calls `GET /api/products?q=%20flux%20`
- **THEN** the response is identical to that of `GET /api/products?q=flux`
