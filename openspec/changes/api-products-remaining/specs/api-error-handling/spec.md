# Spec Delta

## MODIFIED Requirements

### Requirement: Códigos e status do contrato
O contrato compartilhado SHALL definir os códigos `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `PRODUCT_NOT_FOUND` (404), `SKU_CONFLICT` (409), `RATE_LIMITED` (429) e `INTERNAL_ERROR` (500), e a API SHALL responder com o status HTTP associado ao código. Nesta etapa a API SHALL emitir `VALIDATION_ERROR`, `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `SKU_CONFLICT` e `INTERNAL_ERROR`; `RATE_LIMITED` fica reservado para a tarefa que introduz o limite de requisições.

#### Scenario: Status corresponde ao código
- **WHEN** a API responde com `VALIDATION_ERROR`, `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `SKU_CONFLICT` ou `INTERNAL_ERROR`
- **THEN** o status HTTP é, respectivamente, 400, 404, 404, 409 e 500

#### Scenario: Contrato completo definido
- **WHEN** o contrato compartilhado é consultado
- **THEN** ele lista exatamente os seis códigos acima, cada um com o status HTTP associado

## ADDED Requirements

### Requirement: Corpo de requisição malformado ou grande demais
Um corpo JSON que não possa ser interpretado (sintaxe inválida, `null`) ou que exceda o limite de tamanho da API (100 kb) SHALL ser respondido com `400` e `VALIDATION_ERROR` no envelope padronizado, com uma mensagem que indique o problema, sem expor detalhes do parser.

#### Scenario: JSON malformado
- **WHEN** um cliente envia `POST /api/products` com o corpo `{"title":` e `Content-Type: application/json`
- **THEN** a resposta é `400` com `error.code` igual a `VALIDATION_ERROR` e mensagem indicando JSON malformado

#### Scenario: Corpo grande demais
- **WHEN** um cliente envia um corpo JSON maior que 100 kb
- **THEN** a resposta é `400` com `error.code` igual a `VALIDATION_ERROR` e mensagem indicando que o corpo é grande demais
