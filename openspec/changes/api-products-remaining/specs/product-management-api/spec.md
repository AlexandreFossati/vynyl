# Spec Delta

## Purpose

Definir o contrato HTTP para obter, criar, atualizar e remover um produto do catálogo, completando as operações obrigatórias do enunciado junto com a listagem.

## ADDED Requirements

### Requirement: Obter um produto
`GET /api/products/:id` SHALL responder `200` com o produto de mesmo `id`, na mesma representação usada pela listagem. Se não existir, SHALL responder `404` com o código `PRODUCT_NOT_FOUND`.

#### Scenario: Produto existente
- **WHEN** um cliente faz `GET /api/products/1` e o produto 1 existe
- **THEN** a resposta é `200` com o produto de `id` 1 idêntico ao item correspondente da listagem

#### Scenario: Produto inexistente
- **WHEN** um cliente faz `GET /api/products/9999` e esse produto não existe
- **THEN** a resposta é `404` com `error.code` igual a `PRODUCT_NOT_FOUND`

### Requirement: Validação do identificador
O segmento `:id` SHALL ser um inteiro decimal positivo (apenas dígitos, valor maior que zero). Qualquer outro valor SHALL ser rejeitado com `400` e `VALIDATION_ERROR`, identificando `id` em `details`, sem consultar o banco.

#### Scenario: Identificadores inválidos
- **WHEN** um cliente usa `abc`, `0`, `-1`, `1.5` ou `1e2` como `:id` em `GET`, `PATCH` ou `DELETE`
- **THEN** cada requisição recebe `400` com `error.code` igual a `VALIDATION_ERROR` e `details` apontando `id`

### Requirement: Criar um produto
`POST /api/products` SHALL validar o corpo JSON com as regras do produto (título, descrição, categoria, preço, estoque, marca, SKU e peso) e responder `201` com o produto criado, incluindo `id` e `meta` gerados pelo servidor, e o cabeçalho `Location` com o caminho do novo recurso (`/api/products/<id>`). O `id` SHALL ser gerado pelo banco e `meta.createdAt` e `meta.updatedAt` SHALL receber o mesmo instante atual no formato ISO 8601 UTC. O corpo SHALL NOT aceitar `id` nem `meta`, nem qualquer campo desconhecido.

#### Scenario: Criação bem-sucedida
- **WHEN** um cliente envia um corpo válido em `POST /api/products`
- **THEN** a resposta é `201`, o corpo contém o produto com `id` novo (maior que o maior existente) e `meta` preenchido, e `Location` aponta para `/api/products/<id>`

#### Scenario: Produto criado é consultável
- **WHEN** o cliente faz `GET` no caminho recebido em `Location`
- **THEN** a resposta é `200` com o mesmo produto retornado na criação

#### Scenario: Preço em centavos exatos
- **WHEN** um produto é criado com `price` igual a `19.99`
- **THEN** o produto retornado e o consultado depois têm `price` igual a `19.99`

#### Scenario: Campos controlados pelo servidor
- **WHEN** o corpo inclui `id` ou `meta`
- **THEN** a resposta é `400` com `VALIDATION_ERROR` e nenhum produto é criado

#### Scenario: Campos inválidos ou ausentes
- **WHEN** o corpo tem `price` negativo, `sku` fora do padrão, campo obrigatório ausente ou campo desconhecido
- **THEN** a resposta é `400` com `VALIDATION_ERROR` e `details` apontando cada campo problemático

#### Scenario: Corpo ausente ou que não é objeto
- **WHEN** o corpo está vazio, é um array ou o `Content-Type` não é JSON
- **THEN** a resposta é `400` com `VALIDATION_ERROR`

### Requirement: SKU único
Nenhum par de produtos SHALL compartilhar o mesmo `sku`. Criar ou atualizar um produto com um `sku` já usado por outro produto SHALL responder `409` com o código `SKU_CONFLICT`, sem alterar dados. A garantia SHALL vir da restrição de unicidade do banco, de modo que requisições concorrentes não criem duplicatas.

#### Scenario: Criação com SKU existente
- **WHEN** um cliente cria um produto com o `sku` de um produto existente
- **THEN** a resposta é `409` com `error.code` igual a `SKU_CONFLICT` e o catálogo permanece com o mesmo número de produtos

#### Scenario: Atualização para o SKU de outro produto
- **WHEN** um cliente atualiza o produto A informando o `sku` do produto B
- **THEN** a resposta é `409` com `SKU_CONFLICT` e o produto A permanece inalterado

#### Scenario: Atualização mantendo o próprio SKU
- **WHEN** um cliente atualiza um produto informando o mesmo `sku` que ele já tem
- **THEN** a resposta é `200`

### Requirement: Atualizar parcialmente um produto
`PATCH /api/products/:id` SHALL aceitar um corpo JSON com um ou mais campos do produto (as mesmas regras de validação da criação, todos opcionais, ao menos um obrigatório), alterar somente os campos informados e responder `200` com o produto completo atualizado. `meta.updatedAt` SHALL receber o instante atual e `meta.createdAt` SHALL permanecer inalterado. O corpo SHALL NOT aceitar `id`, `meta` nem campos desconhecidos. Um `id` inexistente SHALL responder `404` `PRODUCT_NOT_FOUND`.

#### Scenario: Atualização de um campo
- **WHEN** um cliente envia `PATCH /api/products/1` com `{ "stock": 7 }`
- **THEN** a resposta é `200`, `stock` é 7, os demais campos permanecem iguais, `meta.createdAt` não muda e `meta.updatedAt` é posterior ao anterior

#### Scenario: Corpo vazio
- **WHEN** o corpo é `{}`
- **THEN** a resposta é `400` com `VALIDATION_ERROR`

#### Scenario: Campos não permitidos ou inválidos
- **WHEN** o corpo inclui `id`, `meta`, um campo desconhecido ou um valor inválido (por exemplo `stock` negativo)
- **THEN** a resposta é `400` com `VALIDATION_ERROR` e o produto não é alterado

#### Scenario: Produto inexistente
- **WHEN** o cliente faz `PATCH` em um `id` que não existe, com corpo válido
- **THEN** a resposta é `404` com `PRODUCT_NOT_FOUND`

### Requirement: Remover um produto
`DELETE /api/products/:id` SHALL remover definitivamente o produto e responder `204` sem corpo. Um `id` inexistente (inclusive já removido) SHALL responder `404` `PRODUCT_NOT_FOUND`.

#### Scenario: Remoção bem-sucedida
- **WHEN** um cliente faz `DELETE /api/products/1` e o produto existe
- **THEN** a resposta é `204` sem corpo e um `GET` posterior nesse `id` responde `404`

#### Scenario: Remoção repetida
- **WHEN** o cliente repete o `DELETE` do mesmo `id`
- **THEN** a resposta é `404` com `PRODUCT_NOT_FOUND`

#### Scenario: Total refletido na listagem
- **WHEN** um produto é criado ou removido
- **THEN** o `total` de `GET /api/products` aumenta ou diminui em 1
