# api-error-handling Specification

## Purpose

Padronizar como a API comunica erros, para que a SPA e outros clientes tratem qualquer falha por um único formato e código, sem depender de mensagens livres e sem que detalhes internos vazem.

## Requirements

### Requirement: Envelope de erro padronizado
Toda resposta de erro da API SHALL ser JSON no formato `{ "error": { "code", "message", "details"? } }`. `code` SHALL ser um dos códigos do contrato compartilhado, `message` um texto legível e `details`, quando presente, uma lista de objetos `{ path, message }` que identificam onde o problema ocorreu (por exemplo, o parâmetro inválido).

#### Scenario: Erro de validação
- **WHEN** um cliente faz `GET /api/products?limit=0`
- **THEN** a resposta tem `Content-Type` JSON e corpo `{ error: { code: "VALIDATION_ERROR", message, details: [{ path: "limit", message }] } }`

#### Scenario: Erro sem detalhes
- **WHEN** a API responde `404` a uma rota inexistente
- **THEN** o corpo é `{ error: { code: "NOT_FOUND", message } }` sem o campo `details`

### Requirement: Códigos e status do contrato
O contrato compartilhado SHALL definir os códigos `VALIDATION_ERROR` (400), `NOT_FOUND` (404), `PRODUCT_NOT_FOUND` (404), `SKU_CONFLICT` (409), `RATE_LIMITED` (429) e `INTERNAL_ERROR` (500), e a API SHALL responder com o status HTTP associado ao código. A API SHALL emitir todos os seis códigos.

#### Scenario: Status corresponde ao código
- **WHEN** a API responde com `VALIDATION_ERROR`, `NOT_FOUND`, `PRODUCT_NOT_FOUND`, `SKU_CONFLICT`, `RATE_LIMITED` ou `INTERNAL_ERROR`
- **THEN** o status HTTP é, respectivamente, 400, 404, 404, 409, 429 e 500

#### Scenario: Contrato completo definido
- **WHEN** o contrato compartilhado é consultado
- **THEN** ele lista exatamente os seis códigos acima, cada um com o status HTTP associado

### Requirement: Rota inexistente
Qualquer requisição sob `/api` que não corresponda a uma rota existente, em qualquer método e caminho, SHALL receber `404` com o código `NOT_FOUND` no envelope padronizado, e não uma página de erro em HTML nem o `index.html` da SPA. Fora de `/api`, o mesmo vale quando a SPA não está compilada; com a SPA compilada, os caminhos que ela atende seguem a capability `spa-serving`, e os demais (outros métodos, arquivos inexistentes) continuam recebendo `404` com `NOT_FOUND`.

#### Scenario: Caminho desconhecido sob a API
- **WHEN** um cliente faz `GET /api/does-not-exist`
- **THEN** a resposta é `404` com `error.code` igual a `NOT_FOUND`

#### Scenario: Caminho fora da API
- **WHEN** um cliente faz `GET /qualquer-coisa` e a SPA não está compilada
- **THEN** a resposta é `404` com `error.code` igual a `NOT_FOUND`

### Requirement: Erros inesperados não vazam detalhes
Uma falha inesperada durante o atendimento de uma requisição SHALL produzir `500` com o código `INTERNAL_ERROR` e uma mensagem genérica. O corpo da resposta SHALL NOT conter mensagens de exceções internas, consultas SQL, stack traces nem caminhos de arquivos. O erro completo SHALL ser registrado no log, associado ao identificador da requisição.

#### Scenario: Falha do banco de dados
- **WHEN** o banco de dados fica indisponível e um cliente faz `GET /api/products`
- **THEN** a resposta é `500` com `error.code` igual a `INTERNAL_ERROR`, sem texto do erro original no corpo, e o log contém o erro completo com o identificador da requisição

#### Scenario: Erro assíncrono chega ao tratamento central
- **WHEN** um handler assíncrono rejeita a promise com um erro qualquer
- **THEN** o tratamento central produz a resposta `500` `INTERNAL_ERROR`, sem derrubar o processo

### Requirement: Corpo de requisição malformado ou grande demais
Um corpo JSON que não possa ser interpretado (sintaxe inválida, `null`) ou que exceda o limite de tamanho da API (100 kb) SHALL ser respondido com `400` e `VALIDATION_ERROR` no envelope padronizado, com uma mensagem que indique o problema, sem expor detalhes do parser.

#### Scenario: JSON malformado
- **WHEN** um cliente envia `POST /api/products` com o corpo `{"title":` e `Content-Type: application/json`
- **THEN** a resposta é `400` com `error.code` igual a `VALIDATION_ERROR` e mensagem indicando JSON malformado

#### Scenario: Corpo grande demais
- **WHEN** um cliente envia um corpo JSON maior que 100 kb
- **THEN** a resposta é `400` com `error.code` igual a `VALIDATION_ERROR` e mensagem indicando que o corpo é grande demais
