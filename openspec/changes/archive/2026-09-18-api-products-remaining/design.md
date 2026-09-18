# Design

## Context

Estado após a T2 (commits `0b3f3bb` e `110fc6a`): API com `GET /api/products`, camadas `routes → handlers → services → repositories` (+ `mappers`), fábricas com injeção por parâmetro, `validate` com resultado em `res.locals`, `AppError` + `error-handler` central, logs com allowlist e 258 testes. Os **padrões estão aprovados** (`OPENSPEC_TASKS.md`, "Padrões aprovados → API"); esta tarefa os replica sem variar. Motivação e escopo: `proposal.md`; requisitos: `specs/`.

Fatos verificados (scratchpad):

| Fato | Consequência |
|---|---|
| Duplicidade de `sku` chega como um `Error` genérico do Drizzle (`Failed query: ...`) cujo `cause` é um `LibsqlError` com `code: SQLITE_CONSTRAINT`, `rawCode: 2067` e mensagem `UNIQUE constraint failed: products.sku` (no `insert` e no `update`) | o repository detecta o conflito inspecionando o `cause`, não a mensagem do erro externo |
| `insert/update/delete ... returning()` funcionam; `update` e `delete` de `id` inexistente devolvem `[]` | um único comando devolve o resultado e sinaliza "não encontrado" (sem `select` prévio) |
| Atualizar mantendo o próprio `sku` não conflita | não é preciso tratar esse caso |
| `omit` e `partial` do Zod 4 preservam o modo estrito | `id`, `meta` e chaves desconhecidas são rejeitados sem código extra |
| Erros do `body-parser` trazem `type` (`entity.parse.failed` com status 400, `entity.too.large` com 413); `null` também vira `entity.parse.failed`; corpo vazio com `application/json` vira `{}`; `text/plain` deixa `req.body` indefinido | mapear por `type`; o resto cai na validação normal (400) |

## Goals / Non-Goals

**Goals:** completar os endpoints obrigatórios com o mesmo padrão da T2, garantindo unicidade do SKU pelo banco e respostas consistentes com os specs.

**Non-Goals:** rate limit, `/health`, shutdown, singleflight (T4); ordenação e categorias (T9); nova forma de validar, logar ou tratar erros.

## Decisions

### D1. Contratos em `packages/shared`
`createProductInputSchema = productSchema.omit({ id: true, meta: true })`; `updateProductInputSchema = createProductInputSchema.partial().refine(ao menos uma chave)`; `productIdParamsSchema = z.strictObject({ id })` com o mesmo padrão dos inteiros da query (`^\d+$` → número, seguro e `>= 1`). Tipos via `z.infer`. Nenhuma regra de campo é duplicada.

### D2. Repository: erro de domínio para SKU duplicado
Novos métodos: `findById(id)`, `create(row)`, `update(id, patch)` e `remove(id)`, todos com `returning()`; `findById`/`update`/`remove` devolvem `undefined`/`false` quando não há linha. `create` e `update` traduzem o erro de constraint em `DuplicateSkuError` (classe de domínio, sem HTTP) inspecionando `error.cause` (`code === 'SQLITE_CONSTRAINT'` e mensagem com `products.sku`); qualquer outro erro sobe intacto. **Sem "verificar e depois inserir"**: a constraint do banco é a fonte da verdade e evita a condição de corrida.

### D3. Service: 404, 409 e relógio injetado
`createProductsService({ productsRepository, now = () => new Date() })`. `get`/`update`/`remove` lançam `AppError('PRODUCT_NOT_FOUND')` quando não há linha; `DuplicateSkuError` vira `AppError('SKU_CONFLICT', ..., { cause })`. `create` grava `createdAt = updatedAt = now()`; `update` grava só `updatedAt = now()` (mesmo que os valores não mudem). O relógio injetado torna os testes determinísticos e mantém a data fora do repository. Os timestamps seguem o formato ISO 8601 UTC com ms (`toISOString()`).

### D4. Mapper
Novas funções puras: `toProductCreate(input, now)` (preço → centavos com `Math.round`) e `toProductPatch(patch, now)` (só as chaves presentes; `price` → `priceCents`). O `toProduct` existente continua sendo a única saída para o DTO.

### D5. Handler e rotas
Handler: `get`, `create` (`201` + `res.location('/api/products/<id>')`), `update` (`200`) e `remove` (`204`, sem corpo). Rotas: `GET /:id` (`validate params`), `POST /` (`validate body`), `PATCH /:id` (`validate params + body`) e `DELETE /:id` (`validate params`). Nada de lógica nas rotas.

### D6. Parser de JSON e mapeamento dos seus erros
`app.use(express.json())` (limite padrão de 100 kb) antes das rotas. O `error-handler` reconhece erros do `body-parser` pelo `type` e os responde como `400 VALIDATION_ERROR` com mensagens fixas (`Malformed JSON body` / `Request body too large`), sem repassar o texto do parser. O `entity.too.large` (413 nativo) vira 400 porque o contrato só define `VALIDATION_ERROR` para entrada inválida; adicionar um código novo alteraria o contrato compartilhado sem ganho para este projeto.

### D7. Testes
Mesmo estilo da T2: repository com `:memory:`, service com repository *fake* e relógio fixo, handler/rotas com fakes, e rotas de ponta a ponta com `createTestApp`. Cada cenário dos specs mapeia a ao menos um teste.

## Risks / Trade-offs

- **Formato do erro do driver** → detecção isolada em uma função com testes contra o banco real; se o driver mudar, o teste de SKU duplicado falha.
- **413 respondido como 400** → registrado aqui e no spec; o cliente ainda recebe um erro claro.
- **`PATCH` sempre atualiza `updatedAt`**, mesmo sem mudança de valores → simples e previsível.
- **Produtos removidos não voltam no reinício** só enquanto restar ao menos um produto (regra do seed: só semeia com a tabela vazia). Se todos forem removidos, o reinício semeia de novo.
- **`id` novo após `DELETE`** continua crescendo (`AUTOINCREMENT`), nunca reutiliza ids.

## Migration Plan

Não se aplica (sem alteração de schema). Reversão: reverter o commit da tarefa.

## Open Questions

Nenhuma.
