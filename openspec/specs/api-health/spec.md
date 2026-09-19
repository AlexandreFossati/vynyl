# api-health Specification

## Purpose

Allow operators and orchestrators to verify, without authentication, whether the API is alive and can talk to the database.

## Requirements

### Requirement: Health endpoint
`GET /health` (outside the `/api` prefix) SHALL respond `200` with the body `{ "status": "ok" }` when the database answers a query, and `503` with `{ "status": "unavailable" }` when it does not. The response SHALL include `Cache-Control: no-store`, SHALL NOT use the API's error envelope and SHALL NOT expose internal details (error messages, paths, SQL). The failure SHALL be recorded in the log with the request identifier.

#### Scenario: Healthy database
- **WHEN** a client calls `GET /health` with the database available
- **THEN** the response is `200` with `{ "status": "ok" }` and `Cache-Control: no-store`

#### Scenario: Unavailable database
- **WHEN** the database is unavailable and a client calls `GET /health`
- **THEN** the response is `503` with `{ "status": "unavailable" }`, without the original error text, and the log contains the error with the response's `X-Request-Id`

#### Scenario: Read-only
- **WHEN** a client uses `POST /health`
- **THEN** the response is `404` `NOT_FOUND`
