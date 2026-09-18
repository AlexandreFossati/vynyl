# Spec Delta

## MODIFIED Requirements

### Requirement: API de produtos
O módulo de produtos SHALL oferecer: a listagem com `limit`, `offset` e `q` opcionais; obter um produto por `id`; criar um produto (`POST /api/products`); atualizar um produto (`PATCH /api/products/:id`); e remover um produto (`DELETE /api/products/:id`). As respostas com corpo (listagem, produto obtido, criado e atualizado) SHALL ser validadas com o schema compartilhado correspondente; uma resposta que não o satisfaz SHALL falhar com `ApiError` de `code` `INVALID_RESPONSE`. A remoção SHALL resolver sem valor. Todas as operações SHALL aceitar um sinal de cancelamento e SHALL deixar passar, sem alteração, as falhas do cliente HTTP (incluindo o envelope de erro `409` e `400` com `details`).

#### Scenario: Listagem válida
- **WHEN** a API devolve uma página de produtos conforme o contrato
- **THEN** a função resolve com `data`, `total`, `limit` e `offset`

#### Scenario: Resposta fora do contrato
- **WHEN** a API devolve um corpo que não satisfaz o schema
- **THEN** a função rejeita com `ApiError` `INVALID_RESPONSE`

#### Scenario: Obter um produto
- **WHEN** a função de obter é chamada com o `id` 7 e a API devolve o produto
- **THEN** a requisição é `GET /api/products/7` e a função resolve com o produto

#### Scenario: Criar um produto
- **WHEN** a função de criar é chamada com os dados de um produto e a API responde `201` com o produto criado
- **THEN** a requisição é `POST /api/products` com os dados como corpo JSON e a função resolve com o produto criado

#### Scenario: Atualizar um produto
- **WHEN** a função de atualizar é chamada com o `id` 7 e os dados
- **THEN** a requisição é `PATCH /api/products/7` com os dados como corpo JSON e a função resolve com o produto atualizado

#### Scenario: Remover um produto
- **WHEN** a função de remover é chamada com o `id` 7 e a API responde `204`
- **THEN** a requisição é `DELETE /api/products/7` e a função resolve sem valor

#### Scenario: Falha da API
- **WHEN** a API responde `409` `SKU_CONFLICT` a uma criação
- **THEN** a função rejeita com o mesmo `ApiError` (`status` 409, `code` `SKU_CONFLICT`), sem repetir a requisição
