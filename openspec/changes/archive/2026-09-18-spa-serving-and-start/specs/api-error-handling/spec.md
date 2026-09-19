# Spec Delta

## MODIFIED Requirements

### Requirement: Nonexistent route
Any request under `/api` that does not match an existing route, in any method and path, SHALL receive `404` with the code `NOT_FOUND` in the standardized envelope, and not an HTML error page or the SPA's `index.html`. Outside `/api`, the same applies when the SPA is not built; with the SPA built, the paths it serves follow the `spa-serving` capability, and the others (other methods, nonexistent files) keep receiving `404` with `NOT_FOUND`.

#### Scenario: Unknown path under the API
- **WHEN** a client calls `GET /api/does-not-exist`
- **THEN** the response is `404` with `error.code` equal to `NOT_FOUND`

#### Scenario: Path outside the API
- **WHEN** a client calls `GET /qualquer-coisa` and the SPA is not built
- **THEN** the response is `404` with `error.code` equal to `NOT_FOUND`
