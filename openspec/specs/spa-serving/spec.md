# spa-serving Specification

## Purpose
Make the same server deliver the built SPA and the API, so that the whole application runs on a single port, with no manual steps, and the client routes work when reloading or opening by link.

## Requirements

### Requirement: Built SPA files
When the SPA is built (`apps/web/dist/index.html` exists), the server SHALL serve the files in `apps/web/dist` at the site root. A file that does not exist (a path with an extension) SHALL receive `404` with the code `NOT_FOUND` in the standardized envelope, and not the `index.html`. No file outside `apps/web/dist` SHALL be accessible through paths with `..`.

#### Scenario: Existing file
- **WHEN** a client calls `GET /assets/<file>` for a file that is in `apps/web/dist/assets`
- **THEN** the response is `200` with the file's content

#### Scenario: Nonexistent file
- **WHEN** a client calls `GET /assets/missing.js`
- **THEN** the response is `404` with `error.code` equal to `NOT_FOUND`

#### Scenario: Directory escape
- **WHEN** a client asks for a file outside `apps/web/dist` with `..` (including encoded, such as `%2e%2e`)
- **THEN** that file's content is not delivered

### Requirement: Fallback for SPA routes
When the SPA is built, a `GET` or `HEAD` to a path with no extension that does not start with `/api` or `/health` SHALL receive the `index.html` with `200` and an HTML `Content-Type`, so that client routes (`/`, `/products/new`, `/products/7`, `/products/7/edit`, or an unknown path that the SPA shows as "not found") work when opened by link or reloaded. Other methods on those paths SHALL receive `404` `NOT_FOUND`.

#### Scenario: Home page
- **WHEN** a client calls `GET /`
- **THEN** the response is `200` with the SPA's `index.html`

#### Scenario: Client route
- **WHEN** a client calls `GET /products/7/edit`
- **THEN** the response is `200` with the same `index.html`

#### Scenario: Write outside the API
- **WHEN** a client calls `POST /products/7`
- **THEN** the response is `404` with `error.code` equal to `NOT_FOUND`

### Requirement: API and health are not affected
Paths under `/api` and `/health` SHALL keep responding exactly as without the SPA: existing routes normally and any unknown path under `/api` with `404` `NOT_FOUND` in JSON, never with the `index.html`. Static files and the fallback SHALL NOT count toward the API's request limit.

#### Scenario: Unknown route under the API
- **WHEN** a client calls `GET /api/does-not-exist` with the SPA built
- **THEN** the response is `404` with `error.code` equal to `NOT_FOUND`, in JSON

#### Scenario: API and health routes
- **WHEN** a client calls `GET /api/products` and `GET /health` with the SPA built
- **THEN** the responses are the same as before (product list in JSON and health `200`)

### Requirement: Without a built SPA, only the API
If `apps/web/dist/index.html` does not exist at startup, the server SHALL come up normally with only the API, SHALL record a warning in the log saying the SPA was not found and SHALL respond `404` `NOT_FOUND` to paths outside the API.

#### Scenario: Server without the SPA build
- **WHEN** the server comes up without `apps/web/dist/index.html`
- **THEN** it stays up, records the warning and `GET /` responds `404` `NOT_FOUND`
