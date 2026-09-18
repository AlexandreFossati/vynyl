# api-health Specification

## Purpose

Permitir que operadores e orquestradores verifiquem, sem autenticação, se a API está viva e consegue falar com o banco de dados.

## Requirements

### Requirement: Endpoint de saúde
`GET /health` (fora do prefixo `/api`) SHALL responder `200` com o corpo `{ "status": "ok" }` quando o banco de dados responde a uma consulta, e `503` com `{ "status": "unavailable" }` quando não responde. A resposta SHALL incluir `Cache-Control: no-store`, SHALL NOT usar o envelope de erro da API e SHALL NOT expor detalhes internos (mensagens de erro, caminhos, SQL). A falha SHALL ser registrada no log com o identificador da requisição.

#### Scenario: Banco saudável
- **WHEN** um cliente faz `GET /health` com o banco disponível
- **THEN** a resposta é `200` com `{ "status": "ok" }` e `Cache-Control: no-store`

#### Scenario: Banco indisponível
- **WHEN** o banco de dados está indisponível e um cliente faz `GET /health`
- **THEN** a resposta é `503` com `{ "status": "unavailable" }`, sem o texto do erro original, e o log contém o erro com o `X-Request-Id` da resposta

#### Scenario: Somente leitura
- **WHEN** um cliente usa `POST /health`
- **THEN** a resposta é `404` `NOT_FOUND`
