# web-http-client Specification

## Purpose

Isolate in a single place the SPA's HTTP communication with the API, making it resilient to transient failures without ever duplicating a write and delivering typed errors to the rest of the application.

## Requirements

### Requirement: JSON requests
The client SHALL expose a request function that receives the path, the method (default `GET`), query parameters, an optional body and an optional `AbortSignal`. Undefined parameters SHALL be omitted from the URL, a body SHALL be sent as JSON with `Content-Type: application/json`, a `2xx` response with a body SHALL be returned already parsed as JSON, and a `204` response SHALL result in `undefined`.

#### Scenario: Query and response
- **WHEN** the client makes `GET /api/products` with `limit=30`, `offset=0` and `q` undefined
- **THEN** the requested URL contains `limit=30&offset=0`, does not contain `q`, and the result is the response's JSON

#### Scenario: JSON body
- **WHEN** the client makes a `POST` with an object as the body
- **THEN** the body sent is the object's JSON with `Content-Type: application/json`

### Requirement: Typed errors
Every failure SHALL be signaled with an `ApiError` carrying `status`, `code`, `message` and, when present, `details`. A non-`2xx` response with the API's error envelope SHALL preserve the envelope's `code`, `message` and `details`. Without the envelope, the `code` SHALL be `UNKNOWN`. A network failure SHALL have `status` `0` and `code` `NETWORK_ERROR`; a timeout SHALL have `status` `0` and `code` `TIMEOUT`; a `2xx` response whose body is not valid JSON SHALL have `code` `INVALID_RESPONSE`.

#### Scenario: API envelope
- **WHEN** the API responds `404` with `{ "error": { "code": "PRODUCT_NOT_FOUND", "message": "Product 9 not found" } }`
- **THEN** the client rejects with an `ApiError` with `status` 404, `code` `PRODUCT_NOT_FOUND` and the same message

#### Scenario: Response without envelope
- **WHEN** an intermediary responds `502` with an HTML body
- **THEN** the client rejects with an `ApiError` with `status` 502 and `code` `UNKNOWN`

#### Scenario: Network failure
- **WHEN** `fetch` rejects due to lack of connection
- **THEN** the client rejects with an `ApiError` with `status` 0 and `code` `NETWORK_ERROR`

### Requirement: Per-attempt timeout
Each attempt SHALL be interrupted after the configured timeout (default 10 s) and treated as a `TIMEOUT` failure.

#### Scenario: Attempt that does not respond
- **WHEN** the server does not respond within the timeout
- **THEN** the attempt is aborted and fails with `code` `TIMEOUT`

### Requirement: Cancellation by the caller
When the caller's `AbortSignal` is triggered, the client SHALL reject with an `AbortError`, SHALL cancel the wait of an in-progress backoff and SHALL NOT make new attempts.

#### Scenario: Cancellation during the request
- **WHEN** the caller cancels while the request is in progress
- **THEN** the promise rejects with `AbortError` and no new attempt is made

#### Scenario: Cancellation during the backoff wait
- **WHEN** the caller cancels while the client is waiting to try again
- **THEN** the promise rejects with `AbortError` immediately

### Requirement: Retry only when safe
The client SHALL retry a request only if the method is idempotent (`GET`, `HEAD`, `PUT` or `DELETE`) and the failure is a network failure, `TIMEOUT` or status `408`, `429`, `502`, `503` or `504`. `POST` and `PATCH` SHALL NOT be retried. Validation or business `4xx` errors SHALL NOT be retried. The maximum number of retries is 3 by default.

#### Scenario: Retry until success
- **WHEN** a `GET` receives `503` twice and then `200`
- **THEN** the result is the `200` response's and `fetch` was called three times

#### Scenario: Attempts exhausted
- **WHEN** a `GET` receives `503` on all attempts
- **THEN** after 1 initial attempt and 3 retries the client rejects with the `ApiError` of the last response

#### Scenario: Write is not retried
- **WHEN** a `POST` receives `503` or suffers a network failure
- **THEN** `fetch` is called only once and the error is returned

#### Scenario: Validation error is not retried
- **WHEN** a `GET` receives `400` or `404`
- **THEN** `fetch` is called only once

### Requirement: Exponential backoff with jitter
The wait before the retry number `n` (starting at 0) SHALL be a uniform random value between 0 and `min(cap, base × factor^n)` (full jitter), with base 300 ms, factor 2 and cap 5 s by default, all configurable. The source of randomness SHALL be injectable so that behavior is deterministic in tests.

#### Scenario: Increasing wait
- **WHEN** the randomness source always returns 1 and repeated failures occur
- **THEN** the waits before the retries are 300 ms, 600 ms and 1200 ms

#### Scenario: Cap
- **WHEN** the value `base × factor^n` exceeds the cap
- **THEN** the maximum wait is the cap

### Requirement: Respect for Retry-After
When the response that prompted the retry carries `Retry-After` (in seconds or as an HTTP date), the wait SHALL be that value, limited to the backoff cap, instead of the computed value.

#### Scenario: Retry-After in seconds
- **WHEN** a `GET` receives `429` with `Retry-After: 2`
- **THEN** the client waits 2 s before retrying

#### Scenario: Retry-After above the cap
- **WHEN** the response carries `Retry-After: 120` and the cap is 5 s
- **THEN** the client waits 5 s

### Requirement: Products API
The products module SHALL offer: the listing with optional `limit`, `offset` and `q`; getting a product by `id`; creating a product (`POST /api/products`); updating a product (`PATCH /api/products/:id`); and removing a product (`DELETE /api/products/:id`). Responses with a body (listing, product obtained, created and updated) SHALL be validated with the corresponding shared schema; a response that does not satisfy it SHALL fail with `ApiError` with `code` `INVALID_RESPONSE`. Removal SHALL resolve with no value. All operations SHALL accept a cancellation signal and SHALL let the HTTP client's failures pass through unchanged (including the `409` error envelope and `400` with `details`).

#### Scenario: Valid listing
- **WHEN** the API returns a page of products per the contract
- **THEN** the function resolves with `data`, `total`, `limit` and `offset`

#### Scenario: Response outside the contract
- **WHEN** the API returns a body that does not satisfy the schema
- **THEN** the function rejects with `ApiError` `INVALID_RESPONSE`

#### Scenario: Get a product
- **WHEN** the get function is called with `id` 7 and the API returns the product
- **THEN** the request is `GET /api/products/7` and the function resolves with the product

#### Scenario: Create a product
- **WHEN** the create function is called with a product's data and the API responds `201` with the created product
- **THEN** the request is `POST /api/products` with the data as the JSON body and the function resolves with the created product

#### Scenario: Update a product
- **WHEN** the update function is called with `id` 7 and the data
- **THEN** the request is `PATCH /api/products/7` with the data as the JSON body and the function resolves with the updated product

#### Scenario: Remove a product
- **WHEN** the remove function is called with `id` 7 and the API responds `204`
- **THEN** the request is `DELETE /api/products/7` and the function resolves with no value

#### Scenario: API failure
- **WHEN** the API responds `409` `SKU_CONFLICT` to a creation
- **THEN** the function rejects with the same `ApiError` (`status` 409, `code` `SKU_CONFLICT`), without retrying the request
