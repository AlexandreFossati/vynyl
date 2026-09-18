# Proposal

## Why

O repositório tem o esqueleto (T1), mas nenhuma lógica de backend. A T2 entrega o **primeiro endpoint de ponta a ponta** (`GET /api/products`, com paginação e busca) junto com toda a fundação que ele exige: configuração, logs, banco, migrations, seed, camadas, validação e tratamento de erros. Como é a tarefa-modelo do backend (`OPENSPEC_TASKS.md`), o que for decidido e aprovado aqui vira o padrão que a T3 (demais endpoints) e a T4 replicam. Por isso a revisão do usuário é um checkpoint: corrigir um padrão agora custa pouco, corrigi-lo depois de replicado custa muito.

## What Changes

- **`packages/shared`**: schema do produto (usado na resposta e para validar o data set no seed), schema da query de listagem (`limit`, `offset`, `q`), tipo/schema da resposta paginada `{ data, total, limit, offset }`, códigos de erro e schema do envelope de erro, constantes de limites.
- **Fundação da API** (`apps/api/src`):
  - configuração por variáveis de ambiente validadas, com falha rápida no boot e `.env` opcional;
  - logger `pino` e log por request (`pino-http`) com `X-Request-Id` e sem dados sensíveis;
  - cliente `@libsql/client` via `drizzle-orm/libsql`, migrations aplicadas no start e seed idempotente de `data/products.json`;
  - camadas `routes → handlers → services → repositories` e `mappers` (um arquivo por camada), com injeção de dependências por parâmetro;
  - middlewares `validate`, tratamento central de erros (`AppError`) e 404 para rota inexistente;
  - `createApp(deps)` e o bootstrap em `server.ts`.
- **Endpoint** `GET /api/products`: 30 itens por padrão, `limit` 1–100, `offset`, busca `q` por substring sem diferenciar maiúsculas de minúsculas em título e descrição, ordenação por `id` crescente.
- **Testes** (Vitest): unitários por camada, repository contra SQLite em memória com as migrations, rotas via Supertest, configuração inválida e seed idempotente.
- Remoção dos `.gitkeep` das pastas que passam a ter arquivos.

**Fora de escopo**: demais endpoints (T3), parser de JSON no corpo (entra com o primeiro `POST`, T3), rate limit, `/health`, graceful shutdown e singleflight (T4), frontend e servir a SPA (T5 a T7), ordenação e categorias (T9).

## Capabilities

### New Capabilities

- `product-listing-api`: contrato HTTP de `GET /api/products`: formato da resposta, representação do produto, paginação, validação dos parâmetros e busca.
- `api-error-handling`: envelope de erro padronizado, códigos e status, rota inexistente e erros inesperados sem vazamento de detalhes.
- `api-configuration`: variáveis de ambiente suportadas, valores padrão, falha rápida com configuração inválida, `.env` opcional e resolução do caminho do banco.
- `catalog-bootstrap`: migrations e seed inicial aplicados automaticamente ao iniciar, de forma idempotente e atômica.
- `api-request-logging`: identificador de request, log estruturado por request e ausência de dados sensíveis nos logs.

### Modified Capabilities

<!-- Nenhuma: os requisitos das capabilities existentes (monorepo-workspace, product-database-schema, product-dataset) não mudam. -->

## Impact

- **Código**: `packages/shared/src` (novos módulos e testes) e `apps/api/src` (config, db, lib, middleware, mappers, repositories, services, handlers, routes, `app.ts`, `server.ts` e testes). Nenhuma alteração no schema do banco nem nas migrations.
- **Dependências**: nenhuma nova. Passam a ser usadas as já instaladas na T1: `express`, `zod`, `pino`, `pino-http`, `@libsql/client`, `drizzle-orm`, `supertest`.
- **Comportamento observável**: a API passa a subir em `PORT` (padrão 3000), criar `data/app.db` (ignorado pelo git) e responder `GET /api/products`.
- **Documentação**: o progresso da T2 é refletido no `OPENSPEC_TASKS.md`; a seção "Padrões aprovados" é preenchida pelo usuário após a revisão. Nenhuma decisão do `PROJECT_GUIDE.md` é alterada; o `design.md` registra as poucas escolhas de detalhe (ex.: um único schema de produto, validação em `res.locals`).
- **Riscos**: por ser tarefa-modelo, o maior risco é consolidar um padrão ruim. O `design.md` lista explicitamente os pontos que merecem atenção na revisão.
