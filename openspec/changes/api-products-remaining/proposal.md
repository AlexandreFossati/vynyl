# Proposal

## Why

A T2 entregou a listagem e a fundação do backend. Faltam os demais endpoints obrigatórios do PDF: obter um produto, criar, atualizar e remover. Com o padrão da API aprovado, a T3 os implementa **replicando** esse padrão (camadas, validação, erros, testes), sem inventar uma segunda forma de fazer as coisas.

## What Changes

- `GET /api/products/:id`, `POST /api/products`, `PATCH /api/products/:id` (atualização parcial) e `DELETE /api/products/:id` (remoção definitiva).
- **`packages/shared`**: schemas de criação e atualização derivados do `productSchema` (`omit`/`partial`) e schema do parâmetro `id`.
- **Camadas**: repository (`findById`, `create`, `update`, `remove`, com erro de domínio para SKU duplicado), service (regras de 404 e 409, carimbos de data pelo relógio injetado), handler e rotas; funções novas no mapper (preço em centavos sem erro de ponto flutuante).
- **Unicidade do SKU garantida pela constraint do banco**, traduzida em erro de domínio (sem "verificar e depois inserir").
- **Parser de JSON** (`express.json`, limite padrão de 100 kb) e mapeamento dos seus erros (JSON malformado ou grande demais) para `VALIDATION_ERROR`.
- Testes por camada e por rota.

**Fora de escopo**: rate limit, `/health`, graceful shutdown e singleflight (T4); frontend (T5 em diante); ordenação e categorias (T9); autenticação.

## Capabilities

### New Capabilities

- `product-management-api`: contrato HTTP de obter, criar, atualizar e remover produto: identificador, regras do corpo, campos controlados pelo servidor, SKU único e respostas.

### Modified Capabilities

- `api-error-handling`: os códigos `PRODUCT_NOT_FOUND` e `SKU_CONFLICT` passam a ser emitidos (requisito "Códigos e status do contrato"), e há um novo requisito para corpo de requisição malformado ou grande demais.

## Impact

- **Código**: `packages/shared/src`, `apps/api/src` (mapper, repository, service, handler, routes, error handler, `app.ts`) e testes. Nenhuma alteração de schema do banco nem de dependências.
- **Comportamento observável**: a API passa a aceitar escrita em `/api/products`. O `data/app.db` deixa de ser só leitura; produtos apagados não voltam no reinício enquanto a tabela tiver ao menos um produto (regra do seed).
- **Riscos**: mapear o erro de constraint depende do formato do erro do driver (verificado); o corpo grande demais (413 do `body-parser`) é respondido como 400 `VALIDATION_ERROR` para respeitar o contrato de códigos.
