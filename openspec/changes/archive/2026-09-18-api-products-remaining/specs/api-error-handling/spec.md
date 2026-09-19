# Spec Delta

## MODIFIED Requirements

### Requirement: Contract codes and statuses
The shared contract SHALL define the codes `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `PRODUCT_NOT_FOUND` (404), `SKU_CONFLICT` (409), `RATE_LIMITED` (429) and `INTERNAL_ERROR` (500), and the API SHALL respond with the HTTP status associated with the code. At this stage the API SHALL emit `VALIDATION_ERROR`, `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `SKU_CONFLICT` and `INTERNAL_ERROR`; `RATE_LIMITED` is reserved for the task that introduces the request limit.

#### Scenario: Status matches the code
- **WHEN** the API responds with `VALIDATION_ERROR`, `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `SKU_CONFLICT` or `INTERNAL_ERROR`
- **THEN** the HTTP status is, respectively, 400, 404, 404, 409 and 500

#### Scenario: Complete contract defined
- **WHEN** the shared contract is consulted
- **THEN** it lists exactly the six codes above, each with its associated HTTP status

## ADDED Requirements

### Requirement: Malformed or too-large request body
A JSON body that cannot be parsed (invalid syntax, `null`) or that exceeds the API's size limit (100 kb) SHALL be answered with `400` and `VALIDATION_ERROR` in the standardized envelope, with a message that indicates the problem, without exposing parser details.

#### Scenario: Malformed JSON
- **WHEN** a client sends `POST /api/products` with the body `{"title":` and `Content-Type: application/json`
- **THEN** the response is `400` with `error.code` equal to `VALIDATION_ERROR` and a message indicating malformed JSON

#### Scenario: Body too large
- **WHEN** a client sends a JSON body larger than 100 kb
- **THEN** the response is `400` with `error.code` equal to `VALIDATION_ERROR` and a message indicating that the body is too large
