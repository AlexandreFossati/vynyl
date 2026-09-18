# Spec Delta

## Purpose

Isolar em um único lugar a comunicação HTTP da SPA com a API, tornando-a resiliente a falhas transitórias sem nunca duplicar uma escrita e entregando erros tipados ao resto da aplicação.

## ADDED Requirements

### Requirement: Requisições JSON
O cliente SHALL expor uma função de requisição que recebe o caminho, o método (padrão `GET`), parâmetros de consulta, um corpo opcional e um `AbortSignal` opcional. Parâmetros indefinidos SHALL ser omitidos da URL, um corpo SHALL ser enviado como JSON com `Content-Type: application/json`, uma resposta `2xx` com corpo SHALL ser devolvida já interpretada como JSON, e uma resposta `204` SHALL resultar em `undefined`.

#### Scenario: Consulta e resposta
- **WHEN** o cliente faz `GET /api/products` com `limit=30`, `offset=0` e `q` indefinido
- **THEN** a URL pedida contém `limit=30&offset=0`, não contém `q`, e o resultado é o JSON da resposta

#### Scenario: Corpo JSON
- **WHEN** o cliente faz `POST` com um objeto como corpo
- **THEN** o corpo enviado é o JSON do objeto com `Content-Type: application/json`

### Requirement: Erros tipados
Toda falha SHALL ser sinalizada com um `ApiError` que traz `status`, `code`, `message` e, quando existirem, `details`. Uma resposta fora de `2xx` com o envelope de erro da API SHALL preservar o `code`, a `message` e os `details` do envelope. Sem o envelope, o `code` SHALL ser `UNKNOWN`. Falha de rede SHALL ter `status` `0` e `code` `NETWORK_ERROR`; estouro do tempo limite SHALL ter `status` `0` e `code` `TIMEOUT`; resposta `2xx` cujo corpo não é JSON válido SHALL ter `code` `INVALID_RESPONSE`.

#### Scenario: Envelope da API
- **WHEN** a API responde `404` com `{ "error": { "code": "PRODUCT_NOT_FOUND", "message": "Product 9 not found" } }`
- **THEN** o cliente rejeita com um `ApiError` de `status` 404, `code` `PRODUCT_NOT_FOUND` e a mesma mensagem

#### Scenario: Resposta sem envelope
- **WHEN** um intermediário responde `502` com um corpo HTML
- **THEN** o cliente rejeita com um `ApiError` de `status` 502 e `code` `UNKNOWN`

#### Scenario: Falha de rede
- **WHEN** o `fetch` rejeita por falta de conexão
- **THEN** o cliente rejeita com um `ApiError` de `status` 0 e `code` `NETWORK_ERROR`

### Requirement: Tempo limite por tentativa
Cada tentativa SHALL ser interrompida após o tempo limite configurado (padrão 10 s) e tratada como falha `TIMEOUT`.

#### Scenario: Tentativa que não responde
- **WHEN** o servidor não responde dentro do tempo limite
- **THEN** a tentativa é abortada e falha com `code` `TIMEOUT`

### Requirement: Cancelamento pelo chamador
Quando o `AbortSignal` do chamador é acionado, o cliente SHALL rejeitar com um `AbortError`, SHALL cancelar a espera de um backoff em andamento e SHALL NOT fazer novas tentativas.

#### Scenario: Cancelamento durante a requisição
- **WHEN** o chamador cancela enquanto a requisição está em andamento
- **THEN** a promise rejeita com `AbortError` e nenhuma nova tentativa é feita

#### Scenario: Cancelamento durante a espera do backoff
- **WHEN** o chamador cancela enquanto o cliente aguarda para tentar de novo
- **THEN** a promise rejeita com `AbortError` imediatamente

### Requirement: Retry apenas quando seguro
O cliente SHALL repetir uma requisição somente se o método for idempotente (`GET`, `HEAD`, `PUT` ou `DELETE`) e a falha for de rede, `TIMEOUT` ou status `408`, `429`, `502`, `503` ou `504`. `POST` e `PATCH` SHALL NOT ser repetidos. Erros `4xx` de validação ou de negócio SHALL NOT ser repetidos. O número máximo de repetições é 3 por padrão.

#### Scenario: Repetição até o sucesso
- **WHEN** um `GET` recebe `503` duas vezes e depois `200`
- **THEN** o resultado é o da resposta `200` e o `fetch` foi chamado três vezes

#### Scenario: Tentativas esgotadas
- **WHEN** um `GET` recebe `503` em todas as tentativas
- **THEN** após 1 tentativa inicial e 3 repetições o cliente rejeita com o `ApiError` da última resposta

#### Scenario: Escrita não é repetida
- **WHEN** um `POST` recebe `503` ou sofre falha de rede
- **THEN** o `fetch` é chamado uma única vez e o erro é devolvido

#### Scenario: Erro de validação não é repetido
- **WHEN** um `GET` recebe `400` ou `404`
- **THEN** o `fetch` é chamado uma única vez

### Requirement: Backoff exponencial com jitter
A espera antes da repetição de número `n` (a partir de 0) SHALL ser um valor aleatório uniforme entre 0 e `min(teto, base × fator^n)` (full jitter), com base 300 ms, fator 2 e teto 5 s por padrão, todos configuráveis. A fonte de aleatoriedade SHALL ser injetável para que o comportamento seja determinístico em testes.

#### Scenario: Espera crescente
- **WHEN** a fonte de aleatoriedade sempre devolve 1 e ocorrem falhas repetidas
- **THEN** as esperas antes das repetições são de 300 ms, 600 ms e 1200 ms

#### Scenario: Teto
- **WHEN** o valor `base × fator^n` excede o teto
- **THEN** a espera máxima é o teto

### Requirement: Respeito ao Retry-After
Quando a resposta que motivou a repetição traz `Retry-After` (em segundos ou como data HTTP), a espera SHALL ser esse valor, limitado ao teto do backoff, em vez do valor calculado.

#### Scenario: Retry-After em segundos
- **WHEN** um `GET` recebe `429` com `Retry-After: 2`
- **THEN** o cliente espera 2 s antes de repetir

#### Scenario: Retry-After acima do teto
- **WHEN** a resposta traz `Retry-After: 120` e o teto é de 5 s
- **THEN** o cliente espera 5 s

### Requirement: API de produtos
O módulo de produtos SHALL oferecer a listagem com `limit`, `offset` e `q` opcionais e SHALL validar o corpo da resposta com o schema compartilhado `productListResponseSchema`; uma resposta que não o satisfaz SHALL falhar com `ApiError` de `code` `INVALID_RESPONSE`.

#### Scenario: Listagem válida
- **WHEN** a API devolve uma página de produtos conforme o contrato
- **THEN** a função resolve com `data`, `total`, `limit` e `offset`

#### Scenario: Resposta fora do contrato
- **WHEN** a API devolve um corpo que não satisfaz o schema
- **THEN** a função rejeita com `ApiError` `INVALID_RESPONSE`
