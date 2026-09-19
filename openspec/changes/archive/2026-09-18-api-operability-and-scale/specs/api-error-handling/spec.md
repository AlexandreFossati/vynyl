# Spec Delta

## MODIFIED Requirements

### Requirement: Contract codes and statuses
The shared contract SHALL define the codes `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `PRODUCT_NOT_FOUND` (404), `SKU_CONFLICT` (409), `RATE_LIMITED` (429) and `INTERNAL_ERROR` (500), and the API SHALL respond with the HTTP status associated with the code. The API SHALL emit all six codes.

#### Scenario: Status matches the code
- **WHEN** the API responds with `VALIDATION_ERROR`, `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `SKU_CONFLICT`, `RATE_LIMITED` or `INTERNAL_ERROR`
- **THEN** the HTTP status is, respectively, 400, 404, 404, 409, 429 and 500

#### Scenario: Complete contract defined
- **WHEN** the shared contract is consulted
- **THEN** it lists exactly the six codes above, each with its associated HTTP status
