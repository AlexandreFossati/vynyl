# product-listing-api Specification

## Purpose

Definir o contrato HTTP da listagem de produtos, com paginação e busca, consumida pela SPA e por qualquer outro cliente da API. É o primeiro endpoint do catálogo e serve de modelo para os demais.

## Requirements

### Requirement: Listagem padrão paginada
`GET /api/products` sem parâmetros SHALL responder `200` com um objeto JSON `{ data, total, limit, offset }`. `data` é um array de produtos ordenado por `id` crescente, com no máximo `limit` itens. `limit` assume **30** e `offset` assume **0** quando omitidos. `total` é o número de produtos que satisfazem a busca, independentemente da paginação.

#### Scenario: Listagem padrão com o catálogo inicial
- **WHEN** um cliente faz `GET /api/products` e o catálogo contém os 44 produtos do data set
- **THEN** a resposta é `200`, `data` tem 30 produtos com `id` de 1 a 30 em ordem crescente, `total` é 44, `limit` é 30 e `offset` é 0

#### Scenario: Catálogo vazio
- **WHEN** um cliente faz `GET /api/products` e não há produtos cadastrados
- **THEN** a resposta é `200` com `data` igual a `[]`, `total` igual a 0, `limit` igual a 30 e `offset` igual a 0

### Requirement: Representação do produto
Cada item de `data` SHALL conter exatamente os campos `id`, `title`, `description`, `category`, `price`, `stock`, `brand`, `sku`, `weight` e `meta`, onde `meta` contém `createdAt` e `updatedAt` como texto ISO 8601 UTC. `price` SHALL ser um número decimal em unidade monetária (por exemplo, `9.99`), e não em centavos. Nenhum detalhe interno de armazenamento (como nomes de colunas ou valores em centavos) SHALL ser exposto.

#### Scenario: Produto do enunciado
- **WHEN** um cliente faz `GET /api/products` e localiza o produto de `id` 1
- **THEN** ele é `{ id: 1, title: "Large Flux Capacitor", category: "automotive", price: 9.99, stock: 42, brand: "ACME", sku: "ACM-FC-001", weight: 4, meta: { createdAt: "2025-04-30T09:41:02.053Z", updatedAt: "2025-04-30T09:41:02.053Z" } }` acompanhado de `description`, sem nenhum campo adicional

#### Scenario: Preço em unidade monetária
- **WHEN** um produto está armazenado com 1999 centavos
- **THEN** a resposta expõe `price` igual a `19.99`

### Requirement: Paginação por limit e offset
O parâmetro `limit` SHALL ser um inteiro entre 1 e 100 e `offset` um inteiro maior ou igual a 0. A resposta SHALL ecoar os valores efetivamente aplicados. Páginas consecutivas SHALL não repetir nem omitir produtos, e `total` SHALL ser o mesmo em todas as páginas de uma mesma busca. Um `offset` além do fim do resultado SHALL produzir `200` com `data` vazio.

#### Scenario: Segunda página
- **WHEN** um cliente faz `GET /api/products?limit=10&offset=10` com 44 produtos cadastrados
- **THEN** `data` contém os produtos de `id` 11 a 20, `total` é 44, `limit` é 10 e `offset` é 10

#### Scenario: Última página parcial
- **WHEN** um cliente faz `GET /api/products?offset=30` com 44 produtos cadastrados
- **THEN** `data` contém 14 produtos (`id` de 31 a 44) e `total` é 44

#### Scenario: Limite máximo
- **WHEN** um cliente faz `GET /api/products?limit=100` com 44 produtos cadastrados
- **THEN** `data` contém os 44 produtos e `limit` é 100

#### Scenario: Offset além do fim
- **WHEN** um cliente faz `GET /api/products?offset=1000` com 44 produtos cadastrados
- **THEN** a resposta é `200` com `data` igual a `[]`, `total` igual a 44 e `offset` igual a 1000

### Requirement: Validação dos parâmetros de consulta
Parâmetros inválidos SHALL ser rejeitados com `400` e código `VALIDATION_ERROR`, sem serem corrigidos ou truncados em silêncio. São inválidos: `limit` fora de 1–100 ou que não seja um inteiro decimal simples (dígitos apenas: rejeitam-se `abc`, `1.5`, `-1`, `1e2`, `+5`, valor vazio ou com espaços); `offset` negativo ou que não seja um inteiro decimal simples; qualquer parâmetro repetido; qualquer parâmetro desconhecido; e `q` com mais de 100 caracteres. O erro SHALL identificar o parâmetro problemático em `details`.

#### Scenario: Limite zero
- **WHEN** um cliente faz `GET /api/products?limit=0`
- **THEN** a resposta é `400` com `error.code` igual a `VALIDATION_ERROR` e `error.details` apontando `limit`

#### Scenario: Limite acima do máximo
- **WHEN** um cliente faz `GET /api/products?limit=101`
- **THEN** a resposta é `400` com `error.code` igual a `VALIDATION_ERROR` e nenhum dado é retornado

#### Scenario: Valores que não são inteiros simples
- **WHEN** um cliente envia `limit=abc`, `limit=1.5`, `limit=1e2`, `limit=+5`, `limit=` ou `offset=-1`
- **THEN** cada requisição recebe `400` com `error.code` igual a `VALIDATION_ERROR`

#### Scenario: Parâmetro repetido
- **WHEN** um cliente faz `GET /api/products?limit=10&limit=20`
- **THEN** a resposta é `400` com `error.code` igual a `VALIDATION_ERROR`

#### Scenario: Parâmetro desconhecido
- **WHEN** um cliente faz `GET /api/products?foo=1`
- **THEN** a resposta é `400` com `error.code` igual a `VALIDATION_ERROR`

#### Scenario: Termo de busca longo demais
- **WHEN** um cliente faz `GET /api/products` com `q` de 101 caracteres
- **THEN** a resposta é `400` com `error.code` igual a `VALIDATION_ERROR` e `error.details` apontando `q`

### Requirement: Busca por texto
O parâmetro opcional `q` SHALL filtrar os produtos cujo `title` **ou** `description` contenha `q` como substring, sem diferenciar maiúsculas de minúsculas para letras ASCII. `q` SHALL ser aparado nas extremidades; um `q` vazio ou só com espaços SHALL equivaler a nenhuma busca. Os caracteres `%`, `_` e `\` SHALL ser tratados literalmente, nunca como curingas. A busca SHALL combinar com `limit` e `offset`, e `total` SHALL refletir apenas os produtos encontrados.

#### Scenario: Busca sem diferenciar maiúsculas
- **WHEN** um cliente faz `GET /api/products?q=flux` e depois `GET /api/products?q=FLUX`
- **THEN** as duas respostas têm o mesmo `total` e os mesmos produtos, todos com "flux" (em qualquer caixa) no título ou na descrição

#### Scenario: Correspondência apenas na descrição
- **WHEN** existe um produto cujo título não contém o termo, mas cuja descrição contém, e um cliente busca por esse termo
- **THEN** esse produto está presente no resultado

#### Scenario: Busca combinada com paginação
- **WHEN** um cliente faz `GET /api/products?q=flux&limit=5&offset=5`
- **THEN** `data` contém até 5 produtos da segunda página dos resultados da busca, e `total` é o número total de correspondências

#### Scenario: Busca sem resultados
- **WHEN** um cliente busca por um termo que nenhum produto contém
- **THEN** a resposta é `200` com `data` igual a `[]` e `total` igual a 0

#### Scenario: Curingas do LIKE são literais
- **WHEN** um cliente faz `GET /api/products?q=%25` (o caractere `%`) e nenhum produto contém `%` no título ou na descrição
- **THEN** a resposta é `200` com `data` igual a `[]` e `total` igual a 0, e não o catálogo inteiro

#### Scenario: Caractere de sublinhado literal
- **WHEN** existem produtos cujo título contém `_` e outros que não contêm, e um cliente busca por `_`
- **THEN** somente os produtos que contêm o caractere `_` são retornados

#### Scenario: Termo vazio ou só com espaços
- **WHEN** um cliente faz `GET /api/products?q=%20%20`
- **THEN** a resposta é idêntica à de `GET /api/products` sem `q`

#### Scenario: Termo com espaços nas extremidades
- **WHEN** um cliente faz `GET /api/products?q=%20flux%20`
- **THEN** a resposta é idêntica à de `GET /api/products?q=flux`
