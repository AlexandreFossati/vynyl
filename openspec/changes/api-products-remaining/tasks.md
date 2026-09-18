# Tasks

> Referências: specs em `specs/` (`product-management-api`, `api-error-handling`); decisões em `design.md` (D1–D7); padrões aprovados no `OPENSPEC_TASKS.md`. Idioma: código, comentários e testes em **inglês**; estas tasks em português. Não fazer commit (a orquestração faz depois). **Nenhuma dependência nova.** Temporários de verificação ficam no scratchpad. Testes seguem a Definition of Done do `CLAUDE.md`.

## 1. Contratos e mapper

- [x] 1.1 Criar em `packages/shared/src/product-input.ts` `createProductInputSchema`, `updateProductInputSchema` (parcial, ao menos um campo) e `productIdParamsSchema`, com tipos, exportar no `index.ts` e testar: criação aceita um corpo válido e rejeita `id`, `meta`, chave desconhecida e cada regra de campo violada; atualização aceita um campo, rejeita `{}`, `id`, `meta` e chave desconhecida; `id` aceita `1` e `42` e rejeita `abc`, `0`, `-1`, `1.5`, `1e2`, vazio e valor repetido. Verificar com `npm test -w @vynyl/shared` e `npm run typecheck`.
- [x] 1.2 Acrescentar ao `apps/api/src/mappers/product.mapper.ts` `toProductCreate(input, now)` e `toProductPatch(patch, now)` e testar: preço `19.99`, `0.29`, `4.35` viram 1999, 29 e 435 centavos; `toProductPatch` inclui só as chaves recebidas e sempre `updatedAt`; `createdAt` nunca aparece no patch. Verificar com `npm test -w @vynyl/api`.

## 2. Repository e service

- [x] 2.1 Acrescentar ao repository `findById`, `create`, `update`, `remove` e `DuplicateSkuError` (D2), com testes em banco `:memory:`: `findById` acha e não acha; `create` devolve a linha com `id` gerado maior que o maior existente; `create` com `sku` existente lança `DuplicateSkuError` e não altera a tabela; `update` altera só os campos enviados, devolve a linha, mantém `createdAt`, permite manter o próprio `sku`, lança `DuplicateSkuError` para o `sku` de outro produto e devolve `undefined` para `id` inexistente; `remove` devolve `true` e depois `false`; erros que não são de SKU sobem intactos (banco fechado). Verificar com os testes do `api`.
- [x] 2.2 Acrescentar ao service `get`, `create`, `update` e `remove` com `now` injetado (D3) e testar com repository *fake* e relógio fixo: `get` inexistente lança `PRODUCT_NOT_FOUND`; `create` grava `createdAt` e `updatedAt` iguais ao relógio e devolve o DTO com preço decimal; `DuplicateSkuError` vira `SKU_CONFLICT` (409) com a causa preservada; `update` inexistente lança `PRODUCT_NOT_FOUND`, atualiza só `updatedAt` além dos campos e não toca `createdAt`; `remove` inexistente lança `PRODUCT_NOT_FOUND`; outros erros propagam sem mudança. Verificar com os testes do `api`.

## 3. HTTP

- [x] 3.1 Acrescentar ao handler `get`, `create` (`201` + `Location`), `update` e `remove` (`204`), e as rotas `GET /:id`, `POST /`, `PATCH /:id`, `DELETE /:id` com o `validate` correspondente (D5). Testar com service *fake*: cada handler usa os valores de `res.locals.validated`, responde o status esperado, `create` envia `Location: /api/products/<id>`, `remove` não tem corpo e falhas do service chegam ao error handler; a rota valida antes do handler (id inválido e corpo inválido não chamam o handler). Verificar com os testes do `api`.
- [x] 3.2 Adicionar `express.json()` ao `app.ts` antes das rotas e o mapeamento dos erros do `body-parser` no `error-handler` (D6), com testes: JSON malformado, `null` e corpo acima de 100 kb → `400 VALIDATION_ERROR` com mensagens fixas e sem texto do parser; corpo vazio com `application/json`, `text/plain` e array → `400` pela validação; erros que não são do parser continuam como antes. Verificar com os testes do `api`.

## 4. Rotas de ponta a ponta

- [x] 4.1 Testes de rota via `createTestApp` (data set real) cobrindo **todos os cenários** do spec `product-management-api` e do requisito modificado de `api-error-handling`: obter existente e inexistente; os identificadores inválidos em GET, PATCH e DELETE; criar (201, `Location`, `id` maior que o maior existente, `meta` igual nos dois carimbos, consultável depois, preço `19.99`); campos controlados pelo servidor, inválidos, ausentes, corpo vazio/array/não JSON; SKU duplicado na criação e na atualização (catálogo e produto inalterados) e atualização com o próprio SKU; PATCH de um campo (demais iguais, `createdAt` igual, `updatedAt` posterior), `{}`, `id`/`meta`/desconhecido/inválido, inexistente; DELETE (204 sem corpo, GET seguinte 404, repetição 404); `total` da listagem ±1; 409 e 404 no envelope de erro. Verificar com `npm test -w @vynyl/api` e listar o mapeamento cenário→teste no relatório.

## 5. Verificação em runtime

- [x] 5.1 Iniciar o servidor de desenvolvimento (`tsx`) com banco temporário e exercitar de verdade: `POST` (201 + `Location`), `GET` no `Location`, `PATCH`, `DELETE` (204) e `GET` seguinte (404), SKU duplicado (409), JSON malformado (400), id inválido (400), e `GET /api/products` com `total` coerente; reiniciar o servidor sobre o mesmo banco e verificar que o produto criado permanece e o removido não volta, e que o próximo `id` não reutiliza o removido. Repetir o essencial com o bundle (`npm run build -w @vynyl/api` + `node apps/api/dist/server.js`). Mostrar resultados reais e limpar arquivos temporários.

## 6. Fechamento

- [x] 6.1 Executar na raiz `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npm run format` (duas vezes, idempotente); conferir o escopo (`package.json`/lockfile sem alteração, sem `console.*`/TODO, sem código de T4 como rate limit, `/health`, shutdown, singleflight; sem arquivos temporários); executar `openspec validate api-products-remaining --strict`; refletir no `OPENSPEC_TASKS.md` só os itens de escopo e de aceite da T3 realmente verificados (sem marcar Status geral nem "Fechamento"); entregar o relatório final com o mapeamento cenário→teste e o que não foi verificado.
