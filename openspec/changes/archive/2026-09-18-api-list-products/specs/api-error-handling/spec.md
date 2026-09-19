# Spec Delta

## Purpose

Standardize how the API communicates errors, so that the SPA and other clients handle any failure through a single format and code, without depending on free-form messages and without internal details leaking.

## ADDED Requirements

### Requirement: Standardized error envelope
Every API error response SHALL be JSON in the format `{ "error": { "code", "message", "details"? } }`. `code` SHALL be one of the shared contract's codes, `message` a readable text and `details`, when present, a list of `{ path, message }` objects that identify where the problem occurred (for example, the invalid parameter).

#### Scenario: Validation error
- **WHEN** a client calls `GET /api/products?limit=0`
- **THEN** the response has a JSON `Content-Type` and body `{ error: { code: "VALIDATION_ERROR", message, details: [{ path: "limit", message }] } }`

#### Scenario: Error without details
- **WHEN** the API responds `404` to a nonexistent route
- **THEN** the body is `{ error: { code: "NOT_FOUND", message } }` without the `details` field

### Requirement: Contract codes and statuses
The shared contract SHALL define the codes `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `PRODUCT_NOT_FOUND` (404), `SKU_CONFLICT` (409), `RATE_LIMITED` (429) and `INTERNAL_ERROR` (500), and the API SHALL respond with the HTTP status associated with the code. At this stage the API SHALL emit `VALIDATION_ERROR`, `NOT_FOUND` and `INTERNAL_ERROR`; the other codes are reserved for the tasks that introduce their cases.

#### Scenario: Status matches the code
- **WHEN** the API responds with `VALIDATION_ERROR`, `NOT_FOUND` or `INTERNAL_ERROR`
- **THEN** the HTTP status is, respectively, 400, 404 and 500

#### Scenario: Complete contract defined
- **WHEN** the shared contract is consulted
- **THEN** it lists exactly the six codes above, each with its associated HTTP status

### Requirement: Nonexistent route
Any request that does not match an existing route, in any method and path, SHALL receive `404` with the code `NOT_FOUND` in the standardized envelope, and not an HTML error page.

#### Scenario: Unknown path under the API
- **WHEN** a client calls `GET /api/does-not-exist`
- **THEN** the response is `404` with `error.code` equal to `NOT_FOUND`

#### Scenario: Path outside the API
- **WHEN** a client calls `GET /qualquer-coisa`
- **THEN** the response is `404` with `error.code` equal to `NOT_FOUND`

### Requirement: Unexpected errors do not leak details
An unexpected failure while serving a request SHALL produce `500` with the code `INTERNAL_ERROR` and a generic message. The response body SHALL NOT contain internal exception messages, SQL queries, stack traces or file paths. The full error SHALL be recorded in the log, associated with the request identifier.

#### Scenario: Database failure
- **WHEN** the database becomes unavailable and a client calls `GET /api/products`
- **THEN** the response is `500` with `error.code` equal to `INTERNAL_ERROR`, with no text of the original error in the body, and the log contains the full error with the request identifier

#### Scenario: Async error reaches central handling
- **WHEN** an async handler rejects the promise with any error
- **THEN** central handling produces the `500` `INTERNAL_ERROR` response, without bringing down the process
