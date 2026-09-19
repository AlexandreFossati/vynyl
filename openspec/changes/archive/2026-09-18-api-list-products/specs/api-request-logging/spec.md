# Spec Delta

## Purpose

Make each request traceable by an identifier and record its outcome in structured logs, never exposing sensitive data, to allow diagnosis in production.

## ADDED Requirements

### Requirement: Request identifier
Every API response SHALL include the `X-Request-Id` header. If the client sends an `X-Request-Id` with 1 to 64 characters `A-Z`, `a-z`, `0-9`, `_` or `-`, the value SHALL be reused; otherwise (absent or outside that format), the API SHALL generate a UUID. The same identifier SHALL appear in every log entry for that request.

#### Scenario: Generated identifier
- **WHEN** a client makes a request without `X-Request-Id`
- **THEN** the response carries `X-Request-Id` with a UUID

#### Scenario: Client identifier reused
- **WHEN** a client sends `X-Request-Id: client-123`
- **THEN** the response carries `X-Request-Id: client-123`

#### Scenario: Invalid identifier replaced
- **WHEN** a client sends `X-Request-Id` with spaces or special characters
- **THEN** the response carries a generated UUID, and the sent value does not appear in the logs

### Requirement: Structured log per request
When each request completes, the API SHALL record a JSON log line with the request identifier, the method, the URL, the response status and the response time. The level SHALL be `info` for status below 400, `warn` for 4xx and `error` for 5xx.

#### Scenario: Successful request
- **WHEN** a client calls `GET /api/products` and receives `200`
- **THEN** there is a JSON log line at level `info` with the request `id`, `GET`, the URL, `statusCode` 200 and `responseTime`

#### Scenario: Client error
- **WHEN** a client receives `400`
- **THEN** the corresponding log line has level `warn`

#### Scenario: Server error
- **WHEN** the API responds `500`
- **THEN** the corresponding log line has level `error`

### Requirement: Logs without sensitive data
Logs SHALL contain only previously allowed fields (identifier, method, URL, status and time). Request or response headers (such as `Authorization` and `Cookie`) and request or response bodies SHALL NOT be recorded.

#### Scenario: Sensitive headers
- **WHEN** a client makes a request with `Authorization: Bearer segredo` and `Cookie: session=abc`
- **THEN** no log line contains `segredo` or `session=abc`

### Requirement: Full recording of unexpected errors
When a request ends in `INTERNAL_ERROR`, the API SHALL record the original error (message and stack) at level `error`, with the request identifier, without including it in the response.

#### Scenario: Error recorded with the identifier
- **WHEN** a request fails due to an unexpected error
- **THEN** the log contains an entry at level `error` with the error's message and stack and the same `X-Request-Id` as the response

### Requirement: Configurable log level
The minimum log level SHALL follow `LOG_LEVEL`. With `LOG_LEVEL=silent`, the API SHALL NOT write logs.

#### Scenario: Silenced log
- **WHEN** the API runs with `LOG_LEVEL=silent` and serves a request
- **THEN** nothing is written to the logs
