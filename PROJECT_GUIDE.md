# Guia do Projeto — Teste Vynyl (Base de Conhecimento)

> Documento de referência para todas as sessões de implementação (OpenSpec). Consolida o que o `requirements.pdf` exige (ver checklist completo em `DELIVERABLES.md`) e as decisões técnicas tomadas na sessão de planejamento de 2026-09-18.
> Nenhum código foi escrito nesta fase.
> **Arquivos companheiros**: `CLAUDE.md` (perfil e regras de trabalho do agente, carregado automaticamente em toda sessão), `OPENSPEC_TASKS.md` (divisão do desenvolvimento em tarefas/changes do OpenSpec) e `DELIVERABLES.md` (checklist do PDF). Este guia é a fonte da verdade das decisões técnicas; se uma decisão mudar, atualize-o.

## 0. Princípios (regras do jogo)

1. **Escopo fechado**: implementar apenas o que o PDF pede. Nada além disso. A feature extra é exigida pelo PDF, então está no escopo.
2. **Qualidade de produção dentro desse escopo**: validação na borda, erros padronizados, testes, migrations, config validada, logs, segurança básica, código organizado em camadas. "Production ready" aqui significa fazer bem o que foi pedido, não adicionar funcionalidades.
3. **Prazo curto (60–90 min de referência)**: preferir a solução mais simples que atenda. Priorizar P0 → P1 → P2 (seção 13).
4. **Comunicação é critério de avaliação**: README, AI.md e decisões de produto precisam ser claros. Registrar decisões e limitações ao longo do caminho, não só no final.
5. **Onboarding**: tratar o repo como se outros devs fossem usá-lo. `git clone` → `npm install` → `npm start` deve funcionar sem passos ocultos.
6. **O agente segue o perfil definido no `CLAUDE.md`**: desenvolvedor sênior/especialista, com boas práticas, segurança e disciplina de escopo em toda implementação.
7. **Idioma**: entregáveis do projeto (código, comentários, mensagens, commits, README.md, AI.md) **sempre em inglês**; artefatos do OpenSpec e documentos de planejamento em português durante o desenvolvimento, traduzidos pelo usuário em um commit final exclusivo. Detalhes no `CLAUDE.md`.

## 1. Resumo do que o PDF exige

- SPA + API rodando localmente; avaliador clona o repo e segue as instruções até uma página web funcional.
- Data set seguindo o template de produto (seção 6).
- **API obrigatória**: listar (30 por padrão), obter um, buscar por nome/descrição, criar (POST), atualizar (PUT/PATCH), remover.
- **API opcional**: ordenação, criar categoria, listar categorias, lista de categorias, produtos por categoria.
- **SPA**: interface que exercita a API (ex.: dashboard com lista/resumos, detalhe, criar, editar, excluir).
- **Testes e "outras coisas normais"** (unit, etc.).
- **Feature extra** não especificada, com explicação de problema, público e motivo da escolha.
- **Decisões de produto** que clarificam/estendem a especificação, documentadas.
- **Se algo ficar incompleto**: explicar o que seria feito a seguir.
- **Entregáveis**: link do GitHub com código + `README.md` + `AI.md`; e vídeo de tela da sessão de código **ou** trace completo dos prompts/interações com agentes.

## 2. Decisões de stack (confirmadas pelo usuário)

| Tema | Decisão | Observação |
|---|---|---|
| Linguagem | **TypeScript** (API e SPA) | `strict` ligado |
| API | **Express** (usar a versão 5) | Em vez de Hono, por preferência do usuário. Express 5 trata erros de handlers async |
| Frontend | **Svelte + Vite** (Svelte 5, runes) | SPA pura, sem SvelteKit |
| Banco | **SQLite** | Arquivo local, sem Docker |
| Acesso a dados | **Drizzle ORM + @libsql/client** (SQLite em arquivo local) | Schema em TS, migrations versionadas com drizzle-kit. Driver assíncrono e sem `node-gyp`: o `better-sqlite3` v13 falha no `npm install` a partir do lockfile (ver seção 11.3) |
| Validação/contrato | **Zod**, schemas compartilhados API ↔ SPA | Pacote `packages/shared` |
| Estilo | **CSS puro** com estilos escopados do Svelte + design tokens (variáveis CSS) | Sem Tailwind nem lib de componentes |
| UI | **Clean, simples e mobile-first responsiva** (pré-requisito do frontend) | Ver seção 10.2 |
| Arquitetura API | **Camadas explícitas**: routes → handlers → services → repositories | Ver seção 4 |
| Arquitetura web | **Atomic Design**: atoms, molecules, organisms, templates, pages | Ver seção 10.1 |
| Testes unit | **Vitest** (backend e frontend) | Testing Library no frontend |
| Testes e2e | **Cypress** | Fluxo CRUD pela UI |
| Estrutura | **Monorepo com npm workspaces** | `apps/api`, `apps/web`, `packages/shared` |
| Execução | **`npm start`** apenas | Sem Docker (ver seção 9) |
| Runtime | **Node LTS fixado** | `.nvmrc` + campo `engines` |
| Qualidade | **ESLint + Prettier + TS strict** | Config única na raiz |
| Logs | **pino** + request id | Sem dados sensíveis |
| Config | **Env validada com Zod**, graceful shutdown, `/health` | Falha rápida se env inválida |
| Segurança | **Rate limiting** (`express-rate-limit`) + validação de toda entrada + queries parametrizadas | Ver seção 8 |

## 3. Estrutura do repositório

```
.
├── package.json              # workspaces, scripts raiz
├── .nvmrc                    # Node LTS
├── eslint.config.js / .prettierrc / tsconfig.base.json
├── .env.example
├── README.md                 # como rodar, premissas, decisões, próximos passos
├── AI.md                     # narrativa do fluxo com IA, o que deu certo/errado
├── data/
│   └── products.json         # data set no formato do template (>= 40 itens)
├── packages/
│   └── shared/               # schemas Zod, tipos, códigos de erro, constantes
│       └── src/
├── apps/
│   ├── api/
│   │   ├── drizzle/          # migrations SQL geradas
│   │   └── src/
│   │       ├── server.ts     # bootstrap, shutdown
│   │       ├── app.ts        # createApp(deps): monta middlewares, rotas e injeta as camadas
│   │       ├── config/       # env validada (Zod)
│   │       ├── routes/       # mapeia método+path -> handler (+ middleware de validação)
│   │       ├── handlers/     # camada HTTP: lê req, chama service, escreve res
│   │       ├── services/     # regras de negócio (+ singleflight nas leituras)
│   │       ├── repositories/ # acesso a dados (Drizzle); único lugar que fala com o DB
│   │       ├── mappers/      # linha do banco <-> DTO da API (centavos <-> decimal)
│   │       ├── db/           # conexão, schema Drizzle, migrate, seed
│   │       ├── middleware/   # request-id/logger, validate, rate-limit, error-handler
│   │       └── lib/          # singleflight, logger, errors (AppError e subclasses)
│   └── web/
│       ├── cypress/          # e2e
│       └── src/
│           ├── lib/api/      # http-client (retry/backoff), products-api
│           ├── lib/          # stores, utils, formatação
│           ├── styles/       # tokens.css, base.css
│           └── components/   # Atomic Design
│               ├── atoms/        # Button, Input, Label, Badge, Spinner, Icon...
│               ├── molecules/    # FormField, SearchBox, PriceTag, StockBadge, Pagination...
│               ├── organisms/    # ProductList (tabela/cards), ProductForm, ConfirmDialog, Toaster, Header
│               ├── templates/    # AppShell, PageLayout (só layout, sem dados)
│               └── pages/        # DashboardPage, ProductDetailPage, ProductCreatePage, ProductEditPage
```

Convenções: nomes de arquivos em `kebab-case` (componentes Svelte em `PascalCase`); um arquivo por recurso em cada camada do backend (`products.handler.ts`, `products.service.ts`, `products.repository.ts`, `products.routes.ts`, `products.mapper.ts`); testes ao lado do código (`*.test.ts`); SPA sem regra de negócio duplicada (validação vem do `shared`). As regras de cada camada estão nas seções 4 e 10.

## 4. Arquitetura do backend

**Camadas** (fluxo de uma request): `routes` → `handlers` → `services` → `repositories` → SQLite. Os `mappers` convertem linha do banco ↔ DTO da API.

| Camada | Responsabilidade | Pode | Não pode |
|---|---|---|---|
| `routes` | Declarar método + path, plugar validação e o handler | Referenciar handlers e middleware | Conter lógica |
| `handlers` | Camada HTTP: extrair dados já validados de `req`, chamar o service, escolher status e montar a resposta | Conhecer `req`/`res` | Regra de negócio, acessar o DB |
| `services` | Regras de negócio e orquestração (ex.: SKU duplicado → `AppError`, 404, singleflight nas leituras) | Chamar repositories e mappers, lançar `AppError` | Conhecer `req`/`res`/HTTP, montar SQL |
| `repositories` | Único ponto de acesso ao DB (queries Drizzle, paginação, busca) | Retornar linhas/entidades | Regras de negócio, lançar erros HTTP |
| `mappers` | Conversões puras (centavos ↔ decimal, `meta`) | Funções puras | Efeitos colaterais |

Regras: a dependência só desce (handler → service → repository); cada camada recebe suas dependências por parâmetro (injeção via `createApp`), sem imports de singletons, o que permite testar cada camada isolada. Erros de domínio são `AppError` com `code`/`status` e só o error handler central decide a resposta HTTP. Para adicionar um recurso novo (ex.: categorias), criar um arquivo por camada seguindo o mesmo padrão.

- `createApp(deps)` recebe config/db/logger, permitindo testes com SQLite `:memory:`.
- Middleware em ordem: request id + log → rate limit (em `/api`) → parser JSON (limite padrão do Express) → rotas → 404 → **error handler central**.
- Validação via middleware que usa schemas Zod de `packages/shared` (body, query, params). Objetos com chaves desconhecidas são rejeitados (`strict`).
- Express também serve os estáticos da SPA (`apps/web/dist`) e faz fallback para `index.html` em rotas que não começam com `/api`.
- **Graceful shutdown**: em SIGINT/SIGTERM, parar de aceitar conexões, fechar servidor e depois o DB.
- `/health` fora do prefixo `/api` e fora do rate limit; verifica que o DB responde.

## 5. Banco de dados

- Arquivo em `./data/app.db` (ignorado no git), caminho configurável por `DATABASE_PATH` (convertido para a URL `file:` que o `@libsql/client` recebe; `:memory:` nos testes).
- Pragmas executados na conexão: `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout`.
- **Migrations**: geradas com drizzle-kit, versionadas no repo e aplicadas programaticamente no start.
- **Seed idempotente**: lê `data/products.json`, valida com Zod, converte preço para centavos e só insere se a tabela estiver vazia.
- **Tabela `products`**:

| Coluna | Tipo | Regras |
|---|---|---|
| `id` | integer PK autoincrement | |
| `title` | text | not null |
| `description` | text | not null |
| `category` | text | not null, **índice** |
| `price_cents` | integer | not null, `>= 0` (API expõe `price` decimal) |
| `stock` | integer | not null, `>= 0` |
| `brand` | text | not null |
| `sku` | text | not null, **unique** |
| `weight` | real | not null, `> 0` |
| `created_at` / `updated_at` | text ISO-8601 (UTC) | gerenciados pelo servidor |

- **Categoria** é uma coluna de texto no produto (o PDF só a exige assim). Se os opcionais de categoria forem implementados, introduzir tabela `categories` por migration.
- Busca por `LIKE` com curingas escapados (`ESCAPE`). Índice não ajuda em `%q%`; aceitável na escala do teste. Limitação: `LIKE` do SQLite é case-insensitive apenas para ASCII.

## 6. Data set e contrato de produto

`data/products.json` no formato do PDF (JSON válido, sem vírgulas finais), **mínimo 40 produtos** para que o padrão de 30 por página e a paginação sejam demonstráveis. Tema ACME/inter-dimensional, categorias variadas, SKUs únicos e coerentes.

Representação de produto na API:

```json
{
  "id": 1,
  "title": "Large Flux Capacitor",
  "description": "...",
  "category": "automotive",
  "price": 9.99,
  "stock": 42,
  "brand": "ACME",
  "sku": "ACM-FC-001",
  "weight": 4,
  "meta": { "createdAt": "2025-04-30T09:41:02.053Z", "updatedAt": "2025-04-30T09:41:02.053Z" }
}
```

**Regras de validação (schemas Zod em `shared`)**

| Campo | Regra |
|---|---|
| `title` | string 1–200, trim |
| `description` | string 1–2000, trim |
| `category` | string 1–50, minúscula, trim |
| `price` | número `>= 0`, no máximo 2 casas decimais |
| `stock` | inteiro `>= 0` |
| `brand` | string 1–100, trim |
| `sku` | string 3–40, padrão `^[A-Z0-9-]+$`, único |
| `weight` | número `> 0` |
| `meta.*` | somente leitura: gerado pelo servidor, ignorado/rejeitado na entrada |

## 7. API

Prefixo `/api`. JSON em tudo.

### Obrigatórios (P0)

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| GET | `/api/products?limit=30&offset=0&q=` | Lista paginada, com busca opcional | 200 `{ data, total, limit, offset }` |
| GET | `/api/products/:id` | Produto único | 200 |
| POST | `/api/products` | Cria produto | 201 + header `Location` |
| PATCH | `/api/products/:id` | Atualização **parcial**; atualiza `meta.updatedAt` | 200 |
| DELETE | `/api/products/:id` | Remove (hard delete) | 204 |

Decisões:
- **Paginação**: `limit` padrão **30**, máximo **100**, `offset` padrão 0. Ordem padrão determinística por `id ASC`. Valores fora do intervalo (ex.: `limit=101`) → **400 `VALIDATION_ERROR`**, sem truncar em silêncio.
- **Busca (`q`)**: substring case-insensitive em `title` **e** `description` (mais útil que match exato e ainda atende ao PDF). Combina com paginação.
- **PATCH** em vez de PUT: parcial, exige ao menos um campo.
- `id` inválido (não inteiro positivo) → 400; inexistente → 404.

### Formato de erro padronizado

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Invalid request", "details": [{ "path": "price", "message": "..." }] } }
```

| Situação | HTTP | `code` |
|---|---|---|
| Validação (body/query/params) | 400 | `VALIDATION_ERROR` |
| Produto não encontrado | 404 | `PRODUCT_NOT_FOUND` |
| Rota inexistente | 404 | `NOT_FOUND` |
| SKU duplicado | 409 | `SKU_CONFLICT` |
| Rate limit excedido | 429 | `RATE_LIMITED` (+ `Retry-After`) |
| Erro inesperado | 500 | `INTERNAL_ERROR` (sem vazar stack/detalhes; detalhe só no log) |

### Opcionais (P2, nice to have — só se sobrar tempo)

- Ordenação: `sortBy` (whitelist de colunas) e `order=asc|desc`.
- Categorias: listar todas (objetos), listar nomes (strings), criar categoria, produtos por categoria (`?category=` ou rota dedicada). O PDF cita "Get all product categories" e "Get product category list" separados; interpretar como lista de objetos vs lista de nomes.

## 8. Segurança e operação

Incluído:
- Validação de toda entrada com Zod (body, query, params); chaves desconhecidas rejeitadas.
- Queries parametrizadas via Drizzle; `LIKE` com curingas escapados; whitelist para colunas de ordenação (P2).
- **Rate limiting** em `/api` (padrão sugerido: 100 req/min por IP, configurável por env), com cabeçalhos padrão e resposta 429 no formato de erro padronizado. Configurar `trust proxy` conforme ambiente.
- Erros internos não vazam detalhes; logs estruturados (pino) com request id, sem dados sensíveis.
- Config por env validada no boot; `.env.example` versionado; `.env` e `data/*.db` no `.gitignore`.
- Limite de body: apenas o padrão do `express.json()` (100 kb).

**Fora por decisão do usuário** (documentar no README como premissa/próximo passo):
- Autenticação/autorização (não está no PDF): a API é aberta.
- `helmet` (headers de segurança) e CORS restrito. Como SPA e API são servidas na mesma origem, CORS não é necessário em produção; no modo dev usar proxy do Vite.

## 9. Execução (`npm start`)

- `npm install` na raiz instala todos os workspaces.
- **`npm start`**: builda `shared`, `api` e `web`, aplica migrations, roda seed idempotente e sobe o Express servindo API + SPA em **http://localhost:3000**. Um comando, uma porta.
- **`npm run dev`**: API com reload + Vite com proxy para `/api` (para desenvolver).
- Scripts na raiz: `lint`, `typecheck`, `format`, `test` (Vitest em todos os workspaces), `test:e2e` (Cypress, contra o servidor com DB temporário).
- Sem Docker. Node LTS via `.nvmrc`/`engines`.

## 10. Frontend (SPA)

- Svelte 5 + Vite + TS, `svelte-check` no typecheck.
- **Router**: leve, baseado em History API, compatível com Svelte 5. Validar a biblioteca escolhida no design do OpenSpec; fallback é uma implementação mínima própria. Express faz fallback para `index.html`.
- **Telas**:
  - **Dashboard/lista (home)**: tabela (desktop) e cards (mobile) com resumo dos produtos, busca (debounce), paginação, estados de carregando/vazio/erro.
  - **Detalhe** do produto.
  - **Criar** e **Editar** (formulário compartilhado; validação com o mesmo schema Zod de `shared`; erros por campo; SKU duplicado 409 mostrado no campo).
  - **Excluir** com diálogo de confirmação.
- Feedback com toasts para sucesso/erro; botões desabilitados durante envio.
- **Acessibilidade básica**: labels associados, foco gerenciado em diálogos, navegação por teclado, `aria-live` para mensagens, contraste adequado.
- Estado com stores/runes do Svelte; sem biblioteca de estado ou de fetching extra.

### 10.1 Organização dos componentes: Atomic Design

Cinco níveis em `src/components/`, com dependência apenas **para baixo** (página → template → organismo → molécula → átomo):

| Nível | O que é | Regras | Exemplos deste projeto |
|---|---|---|---|
| `atoms` | Elemento de UI indivisível | Só props e eventos; sem estado de negócio, sem API; estilizado só por tokens | Button, Input, Select, Label, Badge, Spinner, Icon |
| `molecules` | Combinação pequena de átomos com uma função | Sem chamadas de API | FormField (label + input + erro), SearchBox, PriceTag, StockBadge, Pagination, Toast |
| `organisms` | Bloco funcional de interface | Recebem dados e callbacks por props; sem chamadas de API | ProductList (tabela/cards), ProductForm, ConfirmDialog, Toaster, Header |
| `templates` | Esqueleto de layout | Só posicionamento e slots; sem dados | AppShell, PageLayout |
| `pages` | Telas ligadas às rotas | **Único nível que busca/altera dados** (via `lib/api`) e conecta stores | DashboardPage, ProductDetailPage, ProductCreatePage, ProductEditPage |

Regras: um componente por arquivo, nome em `PascalCase`; se um componente é usado por um só pai e nunca será reutilizado, mantê-lo simples (não criar um átomo por criar); props tipadas; nenhum componente abaixo de `pages` importa de `lib/api`.

### 10.2 UI: pré-requisito de design (clean, simples e responsiva)

Objetivo: parecer profissional e limpo **sem** custo alto de manutenção. Feito só com CSS puro e tokens, sem biblioteca de UI.

- **Design tokens** em `styles/tokens.css` (única fonte de cores, espaçamento, tipografia, raio, sombras): paleta neutra + 1 cor de destaque + cores semânticas (sucesso, alerta, perigo); escala de espaçamento (4/8/12/16/24/32/48); escala tipográfica; 2–3 raios; 2 sombras. Sem valores mágicos nos componentes.
- **Visual**: muito espaço em branco, hierarquia tipográfica clara, poucas cores, bordas suaves, estados de hover/foco/desabilitado consistentes. Fonte do sistema (system font stack), sem dependência de fontes externas.
- **Mobile-first**: CSS base para telas pequenas e `min-width` media queries. Breakpoints: 640 px, 1024 px.
- **Responsividade prática**: tabela vira lista de cards no mobile; formulário em coluna única no mobile e duas colunas no desktop; header compacto; diálogos ocupam a tela toda no mobile; alvos de toque de pelo menos 44 px; sem scroll horizontal.
- **Estados sempre visíveis**: carregando (skeleton simples ou spinner), vazio (mensagem + ação), erro (mensagem + tentar novamente).
- **Critérios de aceite**: fluxos principais utilizáveis e sem quebra de layout em 360, 768 e 1280 px de largura; foco visível em todos os elementos interativos; contraste adequado. Sugestão: rodar um smoke do e2e Cypress também com viewport mobile.
- **Fora de escopo** (para manter simples): modo escuro, animações elaboradas, biblioteca de ícones pesada (usar poucos SVGs inline), internacionalização.

## 11. Feature extra: resiliência e escala

**Problema**: sob carga e falhas transitórias, clientes e banco sofrem. **Para quem**: o produto como um todo (operação/SRE e usuários finais, indiretamente). **Por quê**: demonstrar conceitos de escala e resiliência sem acrescentar funcionalidade visível.

### 11.1 REST client com retry e exponential backoff (frontend)

Local: `apps/web/src/lib/api/http-client.ts`. Especificação:
- Wrapper de `fetch` com **timeout** por tentativa (ex.: 10 s, via `AbortController`) e suporte a cancelamento externo (sem retry após abort do chamador).
- **Retry apenas quando seguro**: métodos idempotentes (GET, PUT, DELETE, HEAD). **POST não é repetido** (evitar duplicar criação).
- **Condições de retry**: erro de rede e status 408, 429, 502, 503, 504. Não repetir 4xx de validação/negócio.
- **Backoff exponencial com jitter** (full jitter): base ~300 ms, fator 2, teto ~5 s, máx. 3 retries (valores configuráveis, com defaults).
- Respeitar `Retry-After` (429/503) quando presente, dentro do teto.
- Erros tipados (`ApiError` com `status`, `code`, `details` lidos do envelope de erro padronizado).
- Testes unitários com fake timers e `fetch` mockado: sucesso, retry até sucesso, esgotar tentativas, não repetir POST/4xx, `Retry-After`, timeout, abort, jitter determinístico via injeção de RNG.

### 11.2 Singleflight (backend)

Local: `apps/api/src/lib/singleflight.ts`, usado no `service` nas **leituras** (obter produto por id, listagem/busca).
- API: `do(key, loader)`; se já existe chamada em voo para a mesma `key`, o novo caller aguarda a mesma Promise; ao terminar (sucesso **ou erro**) a chave é removida. **Sem cache** (não guarda resultado após concluir).
- Chave: derivada da operação + parâmetros normalizados (ex.: `product:42`, `list:{limit,offset,q}`).
- **Nunca aplicar a escritas** (POST/PATCH/DELETE).
- Erros propagam para todos os callers que compartilharam a chamada.
- Resultado compartilhado é o mesmo objeto: tratar como imutável (ou clonar na borda).
- Testes: N callers concorrentes → loader executa 1 vez; chaves diferentes não colapsam; erro compartilhado; chave liberada após conclusão; nova chamada após conclusão executa de novo.

### 11.3 Limitação conhecida: o singleflight não coalesce com SQLite local

Com SQLite em arquivo local a query roda na thread principal, então em runtime **não há duas consultas idênticas em voo ao mesmo tempo** e o singleflight não coalesce nada. Isso vale para o `better-sqlite3` (síncrono) **e também para o `@libsql/client`**, apesar de sua API assíncrona: medido no scratchpad, 5 requests chegando em tarefas distintas do event loop executaram a query 5 vezes (0 coalescidas); só chamadas no mesmo tick (ex.: `Promise.all` dentro de um handler) coalescem. Decisão: implementar o componente como padrão, testá-lo com loader assíncrono simulado e **documentar essa limitação no README**. Próximo passo documentado: um banco acessado pela rede (ex.: PostgreSQL) ou executar as leituras em worker threads; só então o singleflight passa a ter efeito real. O README deve ser honesto sobre isso.

## 12. Estratégia de testes

- **Vitest (unit)** em `api`, `web` e `shared`:
  - API: service, mapper (centavos ↔ decimal), singleflight, middlewares (validação, error handler), schemas Zod.
  - Web: http-client (retry/backoff), componentes principais (form, lista, diálogo) com Testing Library.
- **API por rota** (Vitest + Supertest com SQLite em memória): CRUD, paginação (30 padrão, máx. 100), busca, 400/404/409/429. *Assunção do arquiteto*: mesma ferramenta, baixo custo, pedido pelo PDF como "outros testes". Confirmar (seção 15).
- **Cypress (e2e)**: fluxo completo pela UI — listar, buscar, criar, editar, excluir; contra o servidor real com DB temporário e seed.
- Meta: cobrir regras e caminhos de erro, não perseguir um percentual.

## 13. Priorização e plano de entrega

| Prioridade | Itens |
|---|---|
| **P0** | Monorepo + tooling, schemas `shared`, DB + migrations + seed (40+ itens), 5 endpoints obrigatórios com erros padronizados, SPA (lista, detalhe, criar, editar, excluir), testes unit + e2e, `npm start`, README, AI.md |
| **P1** | Feature extra: REST client com retry/backoff, singleflight; rate limit, pino, config Zod, graceful shutdown, `/health` |
| **P2** | Opcionais do PDF: ordenação, categorias (criar/listar/lista/produtos por categoria) |

A divisão em tarefas/changes do OpenSpec, com escopo, critérios de aceite e ordem, está em **`OPENSPEC_TASKS.md`**.

## 14. Guia de conteúdo dos documentos finais

**README.md** deve conter: visão geral; pré-requisitos (Node LTS); como rodar (`npm install`, `npm start`, URL) e como testar; scripts; estrutura; **decisões de produto**; **premissas**; **questões em aberto**; **feature extra** (problema, quem usa, por quê, e a limitação do singleflight com SQLite local); **o que ficou de fora e próximos passos** (auth, helmet, CI, opcionais, driver assíncrono...).

**AI.md** deve conter: narrativa do fluxo com IA (planejamento em Q&A → OpenSpec → implementação); ferramentas usadas; o que funcionou bem; o que funcionou mal ou exigiu correção (ex.: a checagem que mostrou que o singleflight não coalesce com SQLite local, nem com driver assíncrono; e a falha do `npm install` do `better-sqlite3` v13 a partir do lockfile, que só apareceu ao instalar de verdade); lições. Guardar o trace desta sessão de planejamento como evidência.

**Entregável de processo**: gravar a tela das sessões de código **ou** exportar o trace completo dos prompts/agentes.

**Decisões de produto já tomadas** (para o README): PATCH parcial; hard delete; paginação `limit/offset` (30/100); busca por substring em título e descrição; preço em centavos internamente e decimal na API; `meta` controlado pelo servidor; SKU único; categoria como texto; erros padronizados; opcionais adiados; sem autenticação.

## 15. Itens a confirmar / pontos de atenção

1. **GitHub Actions ficou de fora** por decisão do usuário, mas o PDF cita "Github actions" no bloco de API ("do your normal thing… Github actions, etc."). Registrar no README como próximo passo, com a lista de jobs que existiriam (lint, typecheck, unit, e2e). Reavaliar se sobrar tempo.
2. **helmet/CORS restrito** ficaram fora por decisão do usuário. Considerando o pedido de "segurança" e ser barato (poucas linhas), reavaliar; caso permaneçam fora, documentar.
3. **Testes de rota com Supertest**: assunção do arquiteto, não confirmada explicitamente.
4. **Biblioteca de router do Svelte 5**: validar compatibilidade no design do OpenSpec.
5. **Build de `shared`/`api` para `npm start`**: definir no design (tsc com project references vs tsup) o mais simples que funcione em Windows e Linux.
6. **Efeito real do singleflight**: exigiria banco em rede ou worker threads; o driver assíncrono local não basta (ver 11.3).
7. **Tamanho do data set**: definido como 40+ (o PDF não especifica).
