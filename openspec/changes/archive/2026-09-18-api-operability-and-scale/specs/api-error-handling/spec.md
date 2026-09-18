# Spec Delta

## MODIFIED Requirements

### Requirement: Códigos e status do contrato
O contrato compartilhado SHALL definir os códigos `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `PRODUCT_NOT_FOUND` (404), `SKU_CONFLICT` (409), `RATE_LIMITED` (429) e `INTERNAL_ERROR` (500), e a API SHALL responder com o status HTTP associado ao código. A API SHALL emitir todos os seis códigos.

#### Scenario: Status corresponde ao código
- **WHEN** a API responde com `VALIDATION_ERROR`, `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `SKU_CONFLICT`, `RATE_LIMITED` ou `INTERNAL_ERROR`
- **THEN** o status HTTP é, respectivamente, 400, 404, 404, 409, 429 e 500

#### Scenario: Contrato completo definido
- **WHEN** o contrato compartilhado é consultado
- **THEN** ele lista exatamente os seis códigos acima, cada um com o status HTTP associado
