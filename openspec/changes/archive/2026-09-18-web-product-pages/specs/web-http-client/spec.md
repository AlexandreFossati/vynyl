# Spec Delta

## MODIFIED Requirements

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
