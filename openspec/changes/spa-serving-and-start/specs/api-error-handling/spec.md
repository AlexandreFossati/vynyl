# Spec Delta

## MODIFIED Requirements

### Requirement: Rota inexistente
Qualquer requisição sob `/api` que não corresponda a uma rota existente, em qualquer método e caminho, SHALL receber `404` com o código `NOT_FOUND` no envelope padronizado, e não uma página de erro em HTML nem o `index.html` da SPA. Fora de `/api`, o mesmo vale quando a SPA não está compilada; com a SPA compilada, os caminhos que ela atende seguem a capability `spa-serving`, e os demais (outros métodos, arquivos inexistentes) continuam recebendo `404` com `NOT_FOUND`.

#### Scenario: Caminho desconhecido sob a API
- **WHEN** um cliente faz `GET /api/does-not-exist`
- **THEN** a resposta é `404` com `error.code` igual a `NOT_FOUND`

#### Scenario: Caminho fora da API
- **WHEN** um cliente faz `GET /qualquer-coisa` e a SPA não está compilada
- **THEN** a resposta é `404` com `error.code` igual a `NOT_FOUND`
