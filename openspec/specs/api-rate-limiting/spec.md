# api-rate-limiting Specification

## Purpose

Protect the API against excess requests from a single client, responding in a standardized way and telling when to try again, without affecting the health check.

## Requirements

### Requirement: Per-client request limit
Routes under `/api` SHALL accept at most `RATE_LIMIT_MAX` requests per client within each window of `RATE_LIMIT_WINDOW_MS` milliseconds (defaults: 100 per 60 000 ms). The client is identified by IP address. Every response under `/api` SHALL include the standard `RateLimit` and `RateLimit-Policy` headers. When the limit is exceeded, the API SHALL respond `429` with the code `RATE_LIMITED` in the standardized error envelope and the `Retry-After` header (whole seconds until the end of the window), without executing the requested operation. When the window ends, the client SHALL be served normally again.

#### Scenario: Within the limit
- **WHEN** a client makes a number of requests less than or equal to the limit
- **THEN** all are served normally and carry `RateLimit` and `RateLimit-Policy`

#### Scenario: Limit exceeded
- **WHEN** a client makes a request beyond the window's limit
- **THEN** the response is `429` with `error.code` equal to `RATE_LIMITED`, a `Retry-After` header greater than zero and no data change, even for `POST`

#### Scenario: New window
- **WHEN** the limiting window ends
- **THEN** the same client goes back to receiving normal responses

#### Scenario: Clients counted separately
- **WHEN** two clients with different IPs make requests and only one exceeds the limit
- **THEN** only that client receives `429`

### Requirement: Scope of the limit
The limit SHALL apply only to routes under `/api` (including nonexistent routes under `/api`). `GET /health` and other paths outside `/api` SHALL NOT be counted or blocked.

#### Scenario: Health is not limited
- **WHEN** a client already blocked on `/api` calls `GET /health`
- **THEN** the response is not `429`

### Requirement: Client identification behind a proxy
By default (`TRUST_PROXY=0`), the API SHALL ignore the `X-Forwarded-For` header, so that a client cannot escape the limit by varying that header. With `TRUST_PROXY` equal to N greater than zero, the API SHALL trust N proxies and use the IP they indicate.

#### Scenario: Forged header is ignored by default
- **WHEN** a client exhausts the limit and keeps sending `X-Forwarded-For` with different values on each request
- **THEN** the following requests keep receiving `429`

#### Scenario: Trusting one proxy
- **WHEN** `TRUST_PROXY=1` and two clients arrive with distinct `X-Forwarded-For`
- **THEN** each IP reported by the proxy is counted separately
