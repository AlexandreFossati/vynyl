# Design

## Context

Estado após a T1 (commit `21f75b2`): monorepo com `apps/api/src/server.ts` e `packages/shared/src/index.ts` placeholders, `apps/api/src/db/schema.ts` (tabela `products`), migration `0000_init_products.sql`, `data/products.json` (44 produtos), Express 5, Drizzle + `@libsql/client`, pino, pino-http, Zod 4 e Supertest já instalados. As pastas de camadas existem com `.gitkeep`. Motivação e escopo: ver `proposal.md`; requisitos verificáveis: ver `specs/`. Decisões gerais: `PROJECT_GUIDE.md` (seções 4 a 8). A seção "Padrões aprovados" do roadmap está vazia: **esta tarefa cria os padrões**.

Fatos verificados em experimentos no scratchpad (Windows, Node 24.21, versões do lockfile), que condicionam as decisões:

| Fato | Evidência | Consequência |
|---|---|---|
| No Express 5, `req.query` é **somente leitura** | atribuir `req.query = {...}` lança `Cannot set property query ... which has only a getter` | o middleware de validação não pode reescrever `req.query` |
| Parâmetro repetido vira array; sintaxe `a[b]=1` **não** vira objeto (query parser simples) | `?x=1&x=2` → `["1","2"]`; `?a[b]=1` → chave literal `a[b]` | o schema com `string` já rejeita repetição; sem risco de objetos aninhados |
| Rejeição de handler assíncrono chega ao middleware de erro | handler `async` com `throw` → 500 tratado | não é preciso `try/catch` nem wrapper nos handlers |
| Query string malformada (`?q=%`) não quebra o Express | responde 200 com o texto cru | nenhum tratamento extra necessário |
| Transação do libsql em `:memory:` **mantém** os dados | 4 linhas visíveis após `db.transaction` | testes de repository e seed podem usar `:memory:` |
| `PRAGMA journal_mode=WAL` em `:memory:` retorna `memory` | `{"journal_mode":"memory"}` (em arquivo: `wal`) | WAL só se aplica a banco em arquivo |
| `LIKE ... ESCAPE '\'` com escape de `\`, `%`, `_` funciona; é case-insensitive **só para ASCII** | `q=alpha` acha `ALPHA`; `q=É` não acha `é`; `q=%` acha só o texto com `%` literal | limitação já documentada no guia; mantém-se |
| `pino-http` com serializers padrão **vaza** o header `Authorization` | o log continha `TOPSECRET` | serializers próprios em lista de permissão |
| `process.loadEnvFile` lança `ENOENT` se falta o arquivo e **não** sobrescreve variáveis existentes | testado | dá para ter `.env` opcional sem dependência (`dotenv`) |
| libsql aceita `pathToFileURL(caminhoAbsoluto).href` (inclusive com espaço) e falha se a pasta pai não existe | testado | criar a pasta antes de abrir |
| `multipleOf(0.01)` do Zod é seguro em ponto flutuante | aceita `19.99`, `4.35`, `1.15`; rejeita `1.005`, `9.999` | valida "até 2 casas decimais" sem gambiarra |
| Imports `{ pinoHttp }`, `drizzle-orm/libsql`, migrator e a query com `count()`/`sql` compilam sob o `tsconfig` estrito do projeto | esboço com `tsc --noEmit` passou | sem atrito de tipos previsto |

## Goals / Non-Goals

**Goals:**
- Um endpoint completo e testado que sirva de padrão para as demais rotas: mesma estrutura de camadas, validação, erros, logs e testes.
- Fundação operável: iniciar, migrar, semear e servir com `npm run dev -w @vynyl/api` e com o bundle (`node apps/api/dist/server.js`).
- Cada camada testável isoladamente (dependências injetadas por parâmetro).

**Non-Goals:**
- Parser de JSON no corpo (entra com o primeiro `POST`, T3), rate limit, `/health`, graceful shutdown e singleflight (T4), frontend e serving da SPA.
- Ordenação configurável, filtro por categoria e cache.
- Autenticação, `helmet`, CORS (decisões de escopo do guia).

## Decisions

### D1. Estrutura, nomes e injeção de dependências
Um arquivo por camada e por recurso, `kebab-case` com sufixo da camada. Cada camada é uma **função fábrica** que recebe suas dependências por parâmetro e devolve um objeto/interface, sem singletons de módulo. Só `server.ts` (raiz de composição) lê o ambiente e cria recursos reais.

| Arquivo (`apps/api/src/`) | Papel |
|---|---|
| `server.ts` | raiz de composição: caminhos, `.env`, config, logger, banco, migrations, seed, `listen` |
| `app.ts` | `createApp({ db, logger })`: monta middlewares e rotas; compõe repository → service → handler → router |
| `config/env.ts`, `config/paths.ts` | `loadConfig(env)` e `getPaths(import.meta.url)` |
| `lib/errors.ts`, `lib/logger.ts`, `lib/like.ts` | `AppError` + mapa código→status, `createLogger`, `escapeLikePattern` |
| `db/client.ts`, `db/migrate.ts`, `db/seed.ts` | `toDatabaseUrl`/`createDatabase`, `runMigrations`, `seedProducts` |
| `middleware/request-logger.ts`, `validate.ts`, `not-found.ts`, `error-handler.ts` | pipeline HTTP transversal |
| `mappers/product.mapper.ts` | linha ↔ DTO, centavos ↔ decimal |
| `repositories/products.repository.ts` | `interface ProductsRepository` + `createProductsRepository(db)` |
| `services/products.service.ts` | `interface ProductsService` + `createProductsService({ productsRepository })` |
| `handlers/products.handler.ts` | `createProductsHandler({ productsService })` |
| `routes/products.routes.ts` | `createProductsRouter({ productsHandler })` |
| `test/` | ajudantes de teste (`createTestDatabase`, `createTestApp`), não entram no bundle |

`createApp` recebe `{ db, logger }` (o guia previa `config` também; ele só é necessário a partir da T4, então não é passado agora). `app.disable('x-powered-by')` evita expor o framework. Interfaces exportadas permitem *fakes* nos testes de cada camada. **Alternativas**: contêiner de DI ou classes (descartadas: mais cerimônia para o porte); pastas por recurso (`modules/products/`; descartado na decisão do usuário por camadas em pastas de topo).

### D2. Caminhos derivados do local do código, não do diretório de trabalho
`getPaths(importMetaUrl)` calcula `repoRoot` a partir da localização de `server.ts` (`../../..`), o que vale **tanto** para `apps/api/src/server.ts` quanto para `apps/api/dist/server.js` (mesma profundidade). Dele saem `.env` (`<raiz>/.env`), migrations (`<raiz>/apps/api/drizzle`) e data set (`<raiz>/data/products.json`). Resolve a questão em aberto da T1: `DATABASE_PATH` relativo é resolvido contra `repoRoot`, senão `npm run dev -w @vynyl/api` (cwd `apps/api`) criaria outro banco. **Consequência**: as migrations e o data set não são embutidos no bundle; a execução exige o checkout do repositório (é o caso do `npm start`). **Alternativa**: embutir as migrations no bundle ou copiá-las para `dist/`; descartada por mais build sem ganho para este projeto.

### D3. Configuração validada com falha rápida e `.env` opcional
`loadConfig(env)` valida um objeto com Zod (`NODE_ENV`, `PORT`, `DATABASE_PATH`, `LOG_LEVEL`, com padrões) e, se falhar, lança `ConfigError` cuja mensagem lista **cada** variável inválida e o motivo. `server.ts` imprime essa mensagem em `stderr` (via `process.stderr.write`: o logger ainda não existe e o `no-console` proíbe `console`) e encerra com código 1, antes de abrir o banco. `PORT` usa o mesmo padrão dos inteiros da query (`^\d+$` → número → intervalo). O `.env` é carregado com `process.loadEnvFile` (nativo do Node, sem `dotenv`), ignorando `ENOENT` e sem sobrescrever o ambiente. **Premissa a confirmar**: carregar `.env` não estava no roadmap, mas sem isso o `.env.example` não teria função; custa 5 linhas e nenhuma dependência.

### D4. Banco: cliente, URL, pragmas, migrations
`toDatabaseUrl(databasePath, repoRoot)` é pura: `:memory:` passa direto; senão resolve contra `repoRoot` (caminho absoluto é respeitado) e devolve `pathToFileURL(...).href`. `createDatabase` cria a pasta pai se preciso, abre o cliente, executa os pragmas (`foreign_keys=ON`, `busy_timeout=5000` sempre; `journal_mode=WAL` só para arquivo) e devolve `{ client, db }` com `drizzle({ client, schema })`. O `client` é exposto para que testes e o futuro shutdown (T4) possam fechá-lo. `runMigrations(db, migrationsDir)` usa o migrator de `drizzle-orm/libsql/migrator`. **Alternativa**: `drizzle(url)` direto (esconde o cliente; descartada).

### D5. Seed: validar tudo, inserir tudo em uma transação, só com tabela vazia
`seedProducts(db, { file, logger })`: (1) conta os produtos; se houver algum, registra "seed ignorado" e retorna; (2) lê e faz `JSON.parse` do arquivo (erro com o caminho do arquivo); (3) valida o array inteiro com o schema de produto do `shared` (erro indicando índice e campo); (4) insere todos em **uma transação**, preservando `id` e carimbos e convertendo o preço com o mapper. Unicidade de `id`/`sku` fica a cargo das constraints do banco (a transação desfaz tudo), sem duplicar a regra em código. Inserir `id` explícito faz o SQLite continuar a sequência após o maior (o teste confirma que o próximo é 45, protegendo o `POST` da T3). Consequência: se todos os produtos forem apagados (T3) e a API reiniciar, o seed roda de novo; é o comportamento definido no guia ("só se a tabela estiver vazia").

### D6. Contratos em `packages/shared`
- **Um único `productSchema`** (regras de campo do guia, seção 6) usado para tipar a resposta **e** validar o data set. A T3 deriva os schemas de entrada com `omit({ id, meta })` e `partial()`. O roadmap falava em dois schemas; como o formato do data set é idêntico ao da resposta, dois seriam duplicação. Preço: `number`, `>= 0`, `multipleOf(0.01)`; `category`: minúscula; `meta.*`: `z.iso.datetime()`.
- **`listProductsQuerySchema`**: `z.strictObject`; `limit` e `offset` como `string` com `^\d+$`, convertidos e limitados (`limit` 1–100 com padrão 30; `offset` ≥ 0 com padrão 0); `q` opcional, `trim`, máximo 100 caracteres e vazio → ausente. Rejeita repetição (array), chave desconhecida, `1e2`, `+5`, vazio e espaço.
- **`ErrorCode`** (os seis códigos do guia) e **`apiErrorSchema`** do envelope. O mapa código→status fica no `api` (`Record<ErrorCode, number>`, exaustivo: adicionar um código sem status quebra a compilação).
- **`ProductListResponse`**: `{ data: Product[], total, limit, offset }` (schema e tipo), mais as constantes `DEFAULT_LIMIT`, `MAX_LIMIT`, `MAX_SEARCH_LENGTH`.
- Tipos via `z.infer`; nenhum tipo escrito à mão.

### D7. Validação: resultado em `res.locals`, nunca em `req`
`validate({ query, params, body })` valida cada origem informada com Zod. Em sucesso, guarda os valores já convertidos em `res.locals.validated.{query|params|body}` e chama `next()`; em falha, chama `next(new AppError('VALIDATION_ERROR', ...))` com `details` `[{ path, message }]` (`path` das issues do Zod unido por `.`; vazio para issues na raiz, como chave desconhecida). Um acessor tipado (`getValidated<T>(res, 'query')`) concentra o único ponto de asserção de tipo. **Motivo**: `req.query` é somente leitura no Express 5 (evidência acima). **Alternativas**: sobrescrever com `Object.defineProperty` (hack frágil), validar dentro de cada handler (mistura camadas e repete código). `params` e `body` ficam implementados e testados agora porque a T3 os usa.

### D8. Erros: `AppError`, handler central, 404
`AppError(code, message, { details, cause })` deriva o `status` do mapa. O `error-handler` é o único lugar que decide a resposta: `AppError` → envelope com o status do código; qualquer outro erro → loga o erro completo com `req.log.error({ err })` e responde `500 INTERNAL_ERROR` com mensagem genérica; se os headers já foram enviados, delega com `next(err)`. O `not-found` cria um `AppError('NOT_FOUND')` para qualquer rota sem correspondência. Handlers e services só lançam `AppError` (ou deixam o erro subir). Ainda não há mapeamento de erros HTTP do Express/body-parser (ex.: 413), pois o parser de JSON só entra na T3.

### D9. Logs: pino + pino-http em lista de permissão
`createLogger({ level, destination? })` cria o `pino` (o `destination` opcional permite capturar linhas nos testes). `request-logger` usa `pino-http` com: `genReqId` (aproveita `X-Request-Id` que case `^[A-Za-z0-9_-]{1,64}$`, senão UUID, e o devolve no header), **serializers próprios** que emitem só `{ id, method, url }` e `{ statusCode }`, e `customLogLevel` (`info` < 400, `warn` 4xx, `error` 5xx). Lista de permissão em vez de redação (`redact`): não depende de lembrar de cada header sensível. A URL inclui a query string (termos de busca não são sensíveis). **Alternativa**: `redact` de `Authorization`/`Cookie` (descartada: lista negra falha em silêncio quando surge um header novo).

### D10. Repository, service, mapper, handler e rota
- **Repository** (`list({ limit, offset, search? })`): duas consultas com o mesmo `WHERE` (página ordenada por `id ASC` com `limit/offset` e `count(*)`), devolvendo `{ rows, total }`. A busca aplica `title LIKE ? ESCAPE '\' OR description LIKE ? ESCAPE '\'` com o padrão `%${escapeLikePattern(q)}%`, sempre parametrizado. `escapeLikePattern` (em `lib/like.ts`, puro e testado) escapa `\`, `%` e `_`.
- **Service** (`list(query)`): chama o repository, converte as linhas com o mapper e monta `{ data, total, limit, offset }`. É uma função assíncrona pura das suas entradas, o que permite envolvê-la com singleflight na T4 sem alterar a assinatura. Sem regra de negócio adicional nesta tarefa.
- **Mapper**: `toProduct(row)` (`priceCents / 100`, `meta` aninhado) e `toProductInsert(product)` (`Math.round(price * 100)`, exato porque o preço já foi validado com até 2 casas).
- **Handler**: lê `getValidated(res, 'query')`, chama o service e responde `res.json`. **Rota**: `GET /` com `validate({ query })`, montada em `/api/products`.

### D11. Estratégia de testes (padrão para as próximas tarefas)
Testes ao lado do código (`*.test.ts`), sem mock do que está sob teste:
- `shared`: regras dos schemas (valores válidos e cada regra violada), defaults e rejeições da query, contrato de erros.
- `api` unitários: `mapper`, `escapeLikePattern`, `AppError`, `loadConfig`, `toDatabaseUrl`/`getPaths`, `validate` e `error-handler` (com app mínimo do Express).
- `api` com **banco real em memória** (`createTestDatabase`: cliente `:memory:` + migrations): repository (paginação, ordem, total, busca, curingas, `offset` além do fim) e seed (idempotência, atomicidade, ids, centavos, próximo id).
- `service` com repository *fake* (só verifica repasse de parâmetros, mapeamento e envelope).
- **Rotas com Supertest** sobre `createApp` real: cenários dos specs (30 padrão, paginação, busca, cada 400, 404, `X-Request-Id`, ausência de `x-powered-by`) e um caso de 500 real (fechar o `client` antes da requisição e verificar corpo genérico + log). Os logs são capturados com `pino` apontando para um stream em memória.
O data set real (44 itens) é usado nos testes de seed e de rotas; contagens são lidas do próprio arquivo, sem números fixos além dos definidos nos specs.

### D12. Bundle e execução
Sem novas dependências. `tsup` continua embutindo `@vynyl/shared`; `import.meta.url` é ESM puro e funciona no bundle. Verificação obrigatória em runtime (tarefas 6.x): `tsx` (dev) e `node dist/server.js` a partir de outro diretório de trabalho, provando que os caminhos vêm do `repoRoot`.

## Pontos para a revisão do usuário (checkpoint da tarefa-modelo)

O que for aprovado aqui vira padrão. Merecem atenção: (1) organização em fábricas com injeção por parâmetro e nomes de arquivo; (2) validação em `res.locals` com acessor tipado; (3) envelope de erro, `AppError` e mapa de status; (4) um único `productSchema` e `strictObject` na query; (5) estilo dos testes (banco real em memória, Supertest, logs capturados); (6) logs por lista de permissão; (7) resolução de caminhos pela raiz do repositório e `.env` opcional.

## Risks / Trade-offs

- **Padrão ruim replicado** → revisão explícita antes da T3 (seção acima); mudanças de padrão entram no design/roadmap.
- **Página e total em duas consultas** (sem snapshot único) → aceitável: SQLite local, escrita única, sem carga concorrente; se necessário, uma transação de leitura resolve.
- **`LIKE` só ignora caixa em ASCII e faz varredura** → limitação documentada no guia; irrelevante para 44 registros.
- **`res.locals.validated` depende de um cast tipado** → concentrado num único acessor com testes.
- **Logs em JSON no desenvolvimento** (sem `pino-pretty`, que seria dependência nova) → legíveis o bastante; revisitar se incomodar.
- **Migrations e data set fora do bundle** → a execução exige o repositório inteiro (como o `npm start`); registrado no README (T8).
- **`PRAGMA foreign_keys`** ainda sem efeito (não há chaves estrangeiras) → só garante o padrão seguro para o futuro; o teste confere o valor efetivo.
- **SQLite 3.45.1 do libsql** (o `better-sqlite3` teria 3.53) → suficiente para `LIKE ... ESCAPE`, `count`, `strftime` e WAL (verificado).
- **No Windows o libsql não libera o arquivo após `client.close()`** (medido: `EPERM` ao remover o banco enquanto o processo vive, com ou sem WAL) → testes com banco em arquivo limpam o diretório temporário em melhor esforço (o SO o descarta depois); a maioria dos testes usa `:memory:`. Vale também para o e2e da T7: apagar o arquivo só depois de encerrar o processo. Transações e `PRAGMA`s foram verificados: os pragmas persistem após `db.transaction()` e `db.batch()`.
- **Testes acoplados ao data set real** → contagens derivadas do arquivo; falham de forma clara se o data set mudar.
- **Erros HTTP nativos do Express (ex.: 413) ainda viram 500** → só surgem com o parser de JSON, que entra na T3 junto do mapeamento correspondente.

## Migration Plan

Não se aplica (primeiro código de backend; nenhuma alteração de schema nem de dados existentes). Reversão: reverter o commit da tarefa; o arquivo `data/app.db` gerado é ignorado pelo git e pode ser apagado.

## Open Questions

- Nenhuma que bloqueie. Confirmar na revisão a premissa do `.env` opcional (D3). O fechamento do `client` no encerramento do processo é tratado na T4 (graceful shutdown).
