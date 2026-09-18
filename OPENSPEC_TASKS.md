# Plano de Tarefas (OpenSpec) — Teste Vynyl

> Companheiro do `PROJECT_GUIDE.md` (fonte da verdade das decisões). Cada tarefa abaixo corresponde a **um change do OpenSpec**. Antes de qualquer tarefa, o agente lê o guia inteiro, com atenção às seções 4 e 10. O perfil do agente e a Definition of Done estão no `CLAUDE.md` (carregado automaticamente em toda sessão).

## Como usar os checkboxes (leia primeiro)

Este arquivo é o **roadmap e o painel de progresso** do projeto. O agente deve consultar o **Status geral** abaixo para saber o que já foi feito e qual é a próxima tarefa.

- **Próxima tarefa = a primeira tarefa desmarcada do Status geral, na ordem.** Não iniciar uma tarefa cujas anteriores estejam desmarcadas, salvo pedido explícito do usuário.
- `- [ ]` pendente · `- [x]` concluído.
- **Itens dentro de uma tarefa** (escopo, critérios de aceite): o agente marca `[x]` **somente** o que foi de fato implementado e verificado na sessão (comando executado, resultado real). Nunca marcar por suposição.
- **Checkbox da tarefa no Status geral**: só é marcado depois que o **usuário revisa e commita**. O agente não marca sozinho; pergunta ou aguarda o usuário confirmar.
- Se um item deixar de fazer sentido, **não apagar**: explicar o motivo ao lado (ex.: `- [ ] ~~item~~ — adiado: motivo`) e avisar o usuário.
- O `tasks.md` gerado pelo OpenSpec dentro de cada change é o detalhamento fino daquela execução; **este arquivo é o roadmap**. Ao concluir um change, refletir o resultado aqui.

## Status geral

**Passo 0 (feito pelo usuário, fora das tarefas)**
- [x] OpenSpec instalado (`openspec` 1.13.1) e `openspec init` executado
- [x] `CLAUDE.md` conferido após o init: **não foi alterado** pelo OpenSpec
- [x] Decisão sobre arquivos de planejamento no repositório: `requirements.pdf`, `DELIVERABLES.md`, `PROJECT_GUIDE.md`, `CLAUDE.md` e este arquivo **entram no repo** (commit `26bd7c8`)
- [x] **Gravação de tela iniciada (ou export do trace de prompts garantido) antes da primeira sessão de código** — é um entregável do PDF
- [x] Regra de idioma definida: entregáveis em inglês; OpenSpec e planejamento em português (tradução no commit final, feita pelo usuário)

**Tarefas** (ordem de execução; detalhes nas seções abaixo)
- [x] **T1** `scaffold-monorepo` — estrutura vazia + tooling + schema/migration + data set · P0 · checkpoint: 1º commit da estrutura
- [x] **T2** `api-list-products` — **primeiro endpoint completo** (`GET /api/products`) com toda a fundação e testes · P0 · **checkpoint: define o padrão da API**
- [x] **T3** `api-products-remaining` — demais endpoints obrigatórios seguindo o padrão · P0
- [x] **T4** `api-operability-and-scale` — rate limit, `/health`, graceful shutdown, singleflight · P1
- [x] **T5** `web-foundation-dashboard` — design system mínimo + REST client (retry/backoff) + **primeira página** · P0/P1 · **checkpoint: define o padrão do frontend**
- [x] **T6** `web-product-pages` — detalhe, criar, editar, excluir · P0
- [ ] **T7** `e2e-and-serving` — Express serve a SPA, `npm start`, Cypress · P0
- [ ] **T8** `docs-readme-ai` — README.md e AI.md finais, verificação em clone limpo · P0
- [ ] ~~**T9** `optional-endpoints` — ordenação e categorias · P2 · só se sobrar tempo~~ — descartado pelo usuário (sem tempo); o README deve listar como não feito

**Padrões aprovados** (seção no fim deste arquivo)
- [x] Padrões da API registrados (após a revisão de T2)
- [x] Padrões do frontend registrados (após a revisão de T5)

## Como trabalhar cada tarefa

1. Criar o change no OpenSpec (`/opsx:propose`) usando a "Descrição do change" da tarefa como ponto de partida.
2. O agente implementa **apenas** o escopo da tarefa (`/opsx:apply`) e verifica de verdade (lint, typecheck, testes, execução), marcando os checkboxes conforme avança.
3. O agente entrega o relatório final (formato definido no `CLAUDE.md`) e uma sugestão de mensagem de commit. **Não commita.**
4. O usuário revisa o diff e faz o commit; só então o checkbox da tarefa é marcado no Status geral. Depois, arquivar o change (`/opsx:archive`).
5. Se a revisão mudar algum padrão ou decisão, atualizar `PROJECT_GUIDE.md` e a seção **Padrões aprovados** antes da tarefa seguinte.
6. Anotar 3–5 linhas para o `AI.md` (o que funcionou bem/mal nessa tarefa). É mais fácil agora do que reconstruir no final.

**Por que esta ordem**: T1 fixa o esqueleto e o banco. T2 e T5 são **tarefas-modelo**: uma fatia vertical completa no backend e outra no frontend, para você revisar e ajustar o padrão *antes* de replicá-lo (T3 e T6), o que evita retrabalho em escala. T4 vem depois do CRUD porque o singleflight se aplica às leituras já existentes. T7 integra tudo e só faz sentido com API e SPA prontas. Backend antes do frontend porque a SPA consome a API real; T5 só precisa do endpoint de T2.

**Decisão sobre o "primeiro endpoint"**: recomendo `GET /api/products` (lista com paginação e busca). Ele obriga a existir toda a fundação (app factory, config, logger, banco, seed, validação de query, mapper, envelope de resposta, error handler) e é a base do dashboard. A contrapartida é que o padrão de **escrita** (validação de body, 201/`Location`, 409) só é avaliado em T3. Se preferir avaliar a escrita primeiro, troque para `POST /api/products`.

---

## T1 — `scaffold-monorepo`

**Descrição do change**: Criar o esqueleto do monorepo (npm workspaces `apps/api`, `apps/web`, `packages/shared`) com todo o tooling configurado, as pastas das camadas e do Atomic Design, o schema Drizzle e a migration inicial da tabela `products`, e o data set `data/products.json`. Sem lógica de aplicação.

**Escopo (inclui)**
- [x] Raiz: `package.json` (workspaces + scripts multiplataforma `lint`, `typecheck`, `test`, `format`, `build`, `dev`), `.nvmrc` + `engines`, `.gitignore` (inclui `data/*.db`, `.env`, `dist`), `.env.example`, `tsconfig.base.json` (strict), config de ESLint e Prettier
- [x] `packages/shared`: `package.json`, `tsconfig`, entrada placeholder
- [x] `apps/api`: `package.json`, `tsconfig`, config do Vitest, `drizzle.config.ts`, **pastas vazias das camadas** (`routes`, `handlers`, `services`, `repositories`, `mappers`, `db`, `middleware`, `lib`, `config`) com `.gitkeep`, entrada placeholder
- [x] `apps/web`: Vite + Svelte 5 + TS, `svelte-check`, config do Vitest + Testing Library, `index.html`, `main.ts` e um `App.svelte` mínimo que só renderiza o título (prova que a toolchain funciona), **pastas do Atomic Design** (`atoms`, `molecules`, `organisms`, `templates`, `pages`), `lib/api`, `styles`, config do Cypress (`cypress.config.ts` sem specs)
- [x] Dependências já decididas no guia (seção 2) instaladas, `package-lock.json` fechado e **instalação validada em Windows** (em especial `@libsql/client` e Cypress)
- [x] **Banco**: `db/schema.ts` com a tabela `products` conforme seção 5 do guia; migration inicial gerada por drizzle-kit e versionada em `apps/api/drizzle/`; script `db:generate`
- [x] **Data set**: `data/products.json` no formato do template, **40+ produtos**, JSON válido, `id` sequenciais, SKUs únicos (`^[A-Z0-9-]+$`), valores dentro das regras da seção 6, múltiplas categorias e marcas. Os dois primeiros itens são os do PDF (Large e Medium Flux Capacitor)

**Fora de escopo**: app Express, handlers, schemas Zod, seed, config/logger, componentes, tokens de design, CI, README final.

**Critérios de aceite / verificação**
- [x] Clone limpo → `npm install` conclui sem erro no Windows, com Node do `.nvmrc` (verificado com `npm ci` a partir do lockfile e caches vazios; ressalva: caminho-base muito longo no Windows quebra a instalação do Cypress)
- [x] `npm run lint`, `npm run typecheck` e `npm test` passam (sem testes ainda: o runner não deve falhar por ausência deles)
- [x] `npm run dev` no `apps/web` serve a página placeholder
- [x] A migration aplicada num SQLite temporário cria a tabela com PK, `sku` unique e índice em `category` (verificar com um comando pontual, sem criar código)
- [x] `data/products.json` validado com um comando pontual: JSON válido, 40+ itens, `id` e `sku` únicos, todas as regras da seção 6
- [x] Estrutura de pastas idêntica à seção 3 do guia

**Fechamento**
- [ ] Revisão do usuário: estrutura de pastas, scripts, dependências instaladas, schema/migration, qualidade do data set
- [x] Commit feito: `chore: scaffold monorepo, database schema and dataset`
- [x] Anotações para o `AI.md` registradas

---

## T2 — `api-list-products` (tarefa-modelo do backend)

**Descrição do change**: Implementar de ponta a ponta o endpoint `GET /api/products` (lista com paginação e busca), incluindo toda a fundação do backend e testes. O resultado define o padrão que os demais endpoints seguirão.

**Escopo (inclui)**
- [x] **`packages/shared`**: schema do produto (resposta), schema de entrada usado para validar o data set no seed, schema da query de listagem (`limit` padrão 30, máx. 100, `offset` padrão 0, `q` opcional com trim), tipo da resposta paginada `{ data, total, limit, offset }`, enum de códigos de erro e schema do envelope de erro, constantes (limites)
- [x] **Config**: env validada com Zod (porta, caminho do DB, nível de log); falha rápida no boot
- [x] **Logger**: pino + request id (`pino-http`), sem dados sensíveis
- [x] **DB**: conexão `@libsql/client` via `drizzle-orm/libsql` (URL `file:`) com pragmas (WAL, foreign keys, busy timeout); migrations aplicadas programaticamente no start; **seed idempotente** a partir de `data/products.json` (valida com Zod, converte preço para centavos, só insere se a tabela estiver vazia)
- [x] **Camadas** (uma por arquivo, seguindo a seção 4): `routes`, `handlers`, `services`, `repositories` (consulta com `LIKE` escapado em `title`/`description`, contagem total, ordenação `id ASC`), `mappers` (linha ↔ DTO, centavos ↔ decimal, `meta`)
- [x] **Middleware**: `validate` (Zod para query/params/body), **error handler central** + `AppError` (códigos da seção 7), 404 para rota inexistente
- [x] `createApp(deps)` e `server.ts` (listen). Sem graceful shutdown ainda (T4)
- [x] **Testes** (Vitest): mapper; service com repository falso; repository contra SQLite em memória com migrations; rotas via Supertest; config inválida; seed idempotente

**Fora de escopo**: demais endpoints, rate limit, `/health`, graceful shutdown, singleflight, frontend, serving da SPA.

**Decisões fixadas neste change**
- `limit > 100` ou valores inválidos → **400 `VALIDATION_ERROR`** (não truncar em silêncio).
- Busca com `%` e `_` no termo é tratada literalmente (escape).
- Resposta da listagem no formato `{ data, total, limit, offset }`.

**Critérios de aceite / verificação**
- [x] `GET /api/products` retorna 30 itens por padrão com o seed de 40+; `limit`/`offset` funcionam; `total` correto
- [x] `q` é case-insensitive e busca em título **e** descrição; `%`/`_` não viram curinga
- [x] Entradas inválidas (`limit=0`, `limit=101`, `offset=-1`, `limit=abc`) → 400 no formato de erro padronizado; rota inexistente → 404 `NOT_FOUND`; erro inesperado → 500 sem vazar detalhes
- [x] Reiniciar o servidor não duplica o seed
- [x] Lint, typecheck e testes passam
- [x] O agente **executou o servidor e chamou o endpoint** (não só testes) e mostrou o resultado

**Fechamento**
- [x] Revisão do usuário (**checkpoint importante**): separação das camadas, nomes, injeção de dependências, estilo dos testes, formato de erro, organização dos schemas em `shared`, uso de logs. **Tudo que for ajustado aqui vira padrão**
- [x] Padrões da API registrados na seção "Padrões aprovados"
- [x] Commit feito: `feat(api): add paginated product listing with search`
- [x] Anotações para o `AI.md` registradas

---

## T3 — `api-products-remaining`

**Descrição do change**: Implementar os demais endpoints obrigatórios (`GET /api/products/:id`, `POST`, `PATCH`, `DELETE`) **seguindo estritamente os padrões aprovados em T2**, com testes.

**Escopo (inclui)**
- [x] `GET /api/products/:id` → 200 / 404 `PRODUCT_NOT_FOUND`; `id` inválido → 400
- [x] `POST /api/products` → 201 + header `Location`; body validado (schema estrito, `meta` e `id` não aceitos); SKU duplicado → 409 `SKU_CONFLICT`
- [x] `PATCH /api/products/:id` → atualização **parcial** (ao menos um campo), atualiza `meta.updatedAt`; 404; 409 se alterar para SKU existente
- [x] `DELETE /api/products/:id` → 204 / 404 (hard delete)
- [x] Schemas de criação/atualização em `shared`; conversão de preço para centavos **sem erro de ponto flutuante** (ex.: `19.99`)
- [x] **Conflito de SKU** tratado pela constraint `unique` do banco (traduzindo o erro em erro de domínio), **não** por "verificar e depois inserir" (evita condição de corrida)
- [x] Testes por camada e por rota (felizes, validação, 404, 409, campos extras rejeitados, `updatedAt` mudando, `createdAt` intacto)

**Fora de escopo**: qualquer novo padrão; rate limit, singleflight, health (T4); frontend.

**Critérios de aceite**
- [x] Todos os endpoints respondem conforme a seção 7 do guia; regras da seção 6 aplicadas
- [x] Nenhum desvio do padrão de T2 sem aprovação
- [x] Lint, typecheck e testes passam
- [x] O agente exercitou os endpoints com o servidor rodando

**Fechamento**
- [ ] Revisão do usuário: consistência com T2, cobertura de erros
- [x] Commit feito: `feat(api): add product get, create, update and delete endpoints`
- [x] Anotações para o `AI.md` registradas

---

## T4 — `api-operability-and-scale` (feature extra, parte backend)

**Descrição do change**: Adicionar rate limiting, endpoint de saúde, graceful shutdown e o singleflight nas leituras.

**Escopo (inclui)**
- [x] **Rate limit** (`express-rate-limit`) em `/api`, configurável por env (padrão sugerido: 100 req/min/IP), cabeçalhos padrão, 429 `RATE_LIMITED` no formato de erro + `Retry-After`; `trust proxy` via config
- [x] **`GET /health`** fora de `/api` e do rate limit; 200 se o DB responde, 503 caso contrário
- [x] **Graceful shutdown**: SIGINT/SIGTERM param de aceitar conexões, aguardam as em andamento (com timeout), fecham servidor e DB
- [x] **Singleflight** (`lib/singleflight.ts`) conforme seção 11.2 do guia, aplicado no **service** às leituras (`get by id` e `list`), nunca às escritas; sem cache
- [x] Testes: rate limit (janela pequena via config), health (ok e falha do DB), shutdown (lógica testável), singleflight (N callers concorrentes → loader executa 1 vez; chaves diferentes não colapsam; erro compartilhado; chave liberada após concluir; nova chamada após concluir executa de novo; loader assíncrono simulado)
- [x] **Limitação documentada** no código e no relatório (guia, seção 11.3): com SQLite local (inclusive via `@libsql/client`) não há coalescência real em runtime. O agente **não deve** alegar que o singleflight reduz consultas com este banco

**Fora de escopo**: trocar de driver, cache, métricas, helmet.

**Critérios de aceite**
- [x] 429 ocorre ao exceder o limite e volta ao normal depois
- [x] `/health` correto (200 e 503)
- [x] Encerramento limpo sem conexões penduradas
- [x] Testes do singleflight passam
- [x] Lint, typecheck e testes verdes

**Fechamento**
- [ ] Revisão do usuário
- [x] Commit feito: `feat(api): add rate limiting, health check, graceful shutdown and singleflight`
- [x] Anotações para o `AI.md` registradas

---

## T5 — `web-foundation-dashboard` (tarefa-modelo do frontend)

**Descrição do change**: Criar a base visual (tokens e estilos), os componentes Atomic Design necessários, o REST client com retry/backoff e a primeira página (dashboard com lista de produtos, busca e paginação), responsiva. Define o padrão do frontend.

**Escopo (inclui)**
- [x] `styles/tokens.css` e `base.css` conforme **seção 10.2** (clean, simples, mobile-first, breakpoints 640/1024, alvos de toque ≥ 44 px, fonte do sistema)
- [x] Componentes **somente os que o dashboard usa**, nos níveis corretos: átomos (Button, Input, Badge, Spinner...), moléculas (SearchBox, Pagination, PriceTag, StockBadge...), organismos (Header, ProductList com tabela no desktop e cards no mobile), template (AppShell/PageLayout), página (DashboardPage). Estados de carregando, vazio e erro (com tentar novamente)
- [x] **REST client** (`lib/api/http-client.ts`) conforme **seção 11.1**: timeout, cancelamento, retry só em métodos idempotentes e nas condições definidas (rede, 408, 429, 502, 503, 504), backoff exponencial com jitter, `Retry-After`, `ApiError` tipado; `products-api` com a listagem
- [x] Roteamento mínimo (rota `/`); biblioteca validada (compatível com Svelte 5) ou fallback próprio
- [x] Proxy do Vite para `/api` (dev)
- [x] Testes: `http-client` completo (fake timers, RNG injetado); componentes principais (SearchBox, Pagination, ProductList) com Testing Library

**Fora de escopo**: detalhe/criar/editar/excluir (T6), toasts, diálogos, modo escuro, animações elaboradas.

**Critérios de aceite / verificação**
- [x] Dashboard lista produtos reais da API, busca com debounce, paginação de 30 por página
- [x] Layout sem quebra e sem scroll horizontal em **360, 768 e 1280 px** (o agente verifica de fato, por exemplo com screenshots via navegador; se não puder, diz explicitamente que não verificou)
- [x] Tabela vira cards no mobile; foco visível; contraste adequado
- [x] Nenhum componente abaixo de `pages` importa de `lib/api`
- [x] Lint, typecheck e testes verdes

**Fechamento**
- [x] Revisão do usuário (**checkpoint importante**): **estética**, granularidade dos componentes, organização Atomic Design, estilo dos testes
- [x] Padrões do frontend registrados na seção "Padrões aprovados"
- [x] Commit feito: `feat(web): add design foundation, http client and product dashboard`
- [x] Anotações para o `AI.md` registradas

---

## T6 — `web-product-pages`

**Descrição do change**: Implementar detalhe, criação, edição e exclusão de produtos na SPA, seguindo os padrões aprovados em T5.

**Escopo (inclui)**
- [x] Rotas e páginas: detalhe, criar, editar
- [x] `ProductForm` compartilhado (criar/editar) com validação pelo **mesmo schema Zod de `shared`**, erros por campo, SKU duplicado (409) exibido no campo, botão desabilitado durante envio, duas colunas no desktop e uma no mobile
- [x] Exclusão com `ConfirmDialog` (tela cheia no mobile, foco gerenciado, tecla Esc)
- [x] Toasts de sucesso/erro; navegação coerente após cada ação; tratamento de 404 (produto inexistente)
- [x] `products-api` estendido (get, create, update, delete), respeitando a regra de não repetir POST
- [x] Testes de componentes e páginas principais

**Fora de escopo**: qualquer feature nova de UI; e2e (T7).

**Critérios de aceite**
- [x] CRUD completo pela UI contra a API real
- [x] Validações client e server refletidas
- [x] Responsivo em 360/768/1280
- [x] Acessibilidade básica (labels, foco, `aria-live`)
- [x] Lint, typecheck e testes verdes

**Fechamento**
- [x] Revisão do usuário
- [x] Commit feito: `feat(web): add product detail, create, edit and delete flows`
- [x] Anotações para o `AI.md` registradas

---

## T7 — `e2e-and-serving`

> **Escopo reduzido pelo usuário:** sem testes e2e nem Cypress. O change do OpenSpec desta tarefa chama-se `spa-serving-and-start`.

**Descrição do change**: Fazer o Express servir a SPA compilada, implementar o `npm start` de um comando e adicionar os testes e2e com Cypress.

**Escopo (inclui)**
- [x] Express serve `apps/web/dist` com fallback para `index.html` (exceto `/api` e `/health`)
- [x] **`npm start`**: build de `shared`, `api` e `web`, migrations, seed idempotente e servidor em **http://localhost:3000**. `npm run dev` (API com reload + Vite com proxy). Forma de build mais simples e multiplataforma escolhida e documentada no design (guia, seção 15, item 5)
- [ ] ~~**Cypress e2e** contra o servidor real com DB temporário (`DATABASE_PATH`): listar, buscar, paginar, criar, editar, excluir, erro de validação/SKU duplicado~~ — descartado pelo usuário (sem tempo); o README deve listar como não feito
- [ ] ~~**1 smoke em viewport mobile**~~ — descartado pelo usuário (sem tempo); o README deve listar como não feito
- [ ] ~~Script `test:e2e` que sobe e derruba o servidor de forma multiplataforma~~ — descartado pelo usuário (sem tempo); o README deve listar como não feito

**Fora de escopo**: CI (ver guia, seção 15), Docker.

**Critérios de aceite**
- [ ] Em clone limpo, `npm install` + `npm start` abre a aplicação funcional em `localhost:3000` no Windows — servidor, HTML, assets e API verificados em clone limpo (`npm ci` + `npm start`, com `curl`); falta o usuário abrir no navegador
- [ ] ~~`npm run test:e2e` passa~~ — descartado pelo usuário (sem tempo); o README deve listar como não feito
- [x] Lint, typecheck e testes verdes

**Fechamento**
- [x] Commit feito: `feat(api): serve the compiled SPA and add npm start`
- [x] Anotações para o `AI.md` registradas

---

## T8 — `docs-readme-ai`

**Descrição do change**: Escrever `README.md` e `AI.md` finais e validar tudo em clone limpo.

**Escopo (inclui)**
- [ ] **README.md** conforme seção 14 do guia: visão geral, requisitos (Node LTS), como rodar/testar, scripts, estrutura, decisões de produto, premissas, questões em aberto, **feature extra** (problema, quem usa, por quê, e a limitação do singleflight com SQLite local), o que ficou de fora e próximos passos (auth, helmet/CORS, GitHub Actions, opcionais, banco em rede para o singleflight ter efeito real)
- [ ] **AI.md**: narrativa do fluxo (planejamento em Q&A → guia → OpenSpec → tarefas com checkpoints), ferramentas, o que funcionou bem/mal, lições; alimentado pelas anotações feitas ao fim de cada tarefa
- [ ] **Verificação final em clone limpo**: seguir o próprio README passo a passo; conferir o `DELIVERABLES.md` item a item

**Fora de escopo**: código novo, salvo correções necessárias descobertas na verificação.

**Critérios de aceite**
- [ ] Um dev que não conhece o projeto consegue rodar seguindo só o README
- [ ] Todos os itens de `DELIVERABLES.md` estão atendidos ou explicitamente justificados

**Fechamento**
- [ ] Revisão do usuário
- [ ] Commit feito: `docs: add README and AI notes`

---

## T9 — `optional-endpoints` (P2, só se sobrar tempo)

> **Descartada pelo usuário (sem tempo):** não implementar; o README deve listar ordenação e categorias como não feitas.

**Descrição do change**: Implementar os endpoints opcionais do PDF, seguindo os padrões aprovados. Pode ser dividido em dois changes.

**Escopo (inclui)**
- [ ] **9a — Ordenação**: `sortBy` (whitelist de colunas) e `order=asc|desc` na listagem; opcionalmente exposta na UI
- [ ] **9b — Categorias**: tabela `categories` por migration (migrando as categorias existentes), listar todas (objetos), listar nomes (strings), criar categoria, produtos por categoria; opcionalmente exposto na UI

**Critérios de aceite**
- [ ] Mesmos da API: testes, erros padronizados, padrões aprovados
- [ ] README atualizado com o que foi feito

**Fechamento**
- [ ] Revisão do usuário
- [ ] Commit feito

---

## Padrões aprovados

> Preencher **após a revisão de T2** (backend) e **após a de T5** (frontend). Agentes das tarefas seguintes devem tratar esta seção como obrigatória. Enquanto estiver vazia, valem as seções 4 e 10 do guia.

### API (aprovado na revisão da T2)
- Convenção de nomes de arquivos/funções por camada: arquivos em `kebab-case` com o sufixo da camada, em pastas de topo (`products.repository.ts`, `.service.ts`, `.handler.ts`, `.routes.ts`, `.mapper.ts`). Cada camada é uma função fábrica `createXxx(deps)` que devolve uma interface exportada (`ProductsRepository`, `ProductsService`, `ProductsHandler`). Testes `*.test.ts` ao lado do código; ajudantes de teste em `src/test/`. Novo recurso = um arquivo por camada, seguindo o mesmo padrão.
- Como as dependências são injetadas: por parâmetro, em um objeto (`{ productsRepository }`), sem singletons de módulo. Só `server.ts` (raiz de composição) lê o ambiente e cria recursos reais; `createApp({ db, logger })` compõe repository → service → handler → router.
- Padrão de validação (onde e como): middleware `validate({ query, params, body })` na rota, com schemas Zod de `@vynyl/shared` (`strictObject`: chave desconhecida ou parâmetro repetido → 400). O resultado fica em `res.locals.validated` e é lido com `getValidated<T>(res, source)`; nunca reescrever `req.query` (somente leitura no Express 5). Erros viram `details: [{ path, message }]`.
- Padrão de erros de domínio → resposta HTTP: lançar `AppError(code, message, { details, cause })`; o status vem do mapa exaustivo `STATUS_BY_CODE`. O `error-handler` central é o único ponto que responde erros (envelope `{ error: { code, message, details? } }`); erros 5xx e não esperados respondem `INTERNAL_ERROR` genérico e são logados por completo com `req.log.error`. Handlers async não precisam de `try/catch` (Express 5). Rota sem correspondência → `NOT_FOUND`.
- Padrão de logs: `pino` via `createLogger`; um log por requisição (`pino-http`) com `X-Request-Id` (reaproveita `[A-Za-z0-9_-]{1,64}`, senão UUID) e nível por status (info/warn/error). Serializers em **lista de permissão** (id, método, URL, status): nunca headers nem corpos. Sem `console.*`.
- Estilo dos testes (unit, repository, rota): comportamento observável, sem mockar o que está sob teste. Repository, seed e rotas usam banco real em `:memory:` (`createTestDatabase`); rotas via Supertest sobre `createApp` (`createTestApp`); fakes só para a camada de baixo (service com repository fake, handler com service fake); logs capturados com `createLogCapture`; contagens derivadas do data set; `vi.waitFor` em vez de esperas fixas; limpeza de arquivos temporários tolerante a falha (Windows).
- Ajustes pedidos na revisão: nenhum; padrões aprovados como implementados. Decisões acrescentadas na implementação: parâmetros com prefixo `_` podem ficar sem uso (regra do ESLint, exigida pelo `_next` do Express); `.env` opcional na raiz (o ambiente tem precedência); caminhos derivados do local do código (`getPaths`) e `DATABASE_PATH` relativo resolvido pela raiz do repositório; data set vazio é rejeitado no seed; no Windows o libsql mantém o arquivo do banco aberto após `close()` (o e2e da T7 só apaga o arquivo depois de encerrar o processo).

### Frontend (aprovado na revisão da T5)
- Convenção de componentes por nível (Atomic Design): um componente por arquivo `PascalCase.svelte` em `components/{atoms,molecules,organisms,templates,pages}`, com o teste `PascalCase.test.ts` ao lado. Props tipadas com `$props()`; eventos como *callback props* (`onclick`, `onsearch`, `onpagechange`), sem `createEventDispatcher`; conteúdo por *snippets* (`children`). Átomos repassam o resto das props ao elemento nativo (`...rest`). Só entra o que uma tela usa. Dependência só para baixo; nenhum componente abaixo de `pages` importa `lib/api` (imposto por `no-restricted-imports` no `eslint.config.js`).
- Padrão de acesso a dados nas páginas: a página recebe a API por prop, com a real como padrão (`{ api = productsApi }: Props`), o que permite testá-la com uma API falsa sem mockar módulos. `lib/api` tem `http-client.ts` (`request` com timeout, cancelamento, retry só em idempotentes, backoff com full jitter, `Retry-After`, `ApiError` tipado) e um módulo por recurso que valida a resposta com o schema de `@vynyl/shared`. Cada nova consulta cancela a anterior com `AbortController` (função `load()` chamada por um `$effect` cujo *cleanup* aborta) e a resposta de uma requisição cancelada é ignorada. Roteamento: `lib/router.svelte.ts` (History API, `router.path` e `router.navigate`); a página é escolhida em `App.svelte`. Sem biblioteca de estado nem de fetching.
- Padrão de estados (carregando/vazio/erro): a molécula `StatusMessage` (título, mensagem, `busy`, ação) serve aos três. Carregando (primeira carga) = `busy`, papel `status`; vazio = papel `status` com ação "Clear search" quando há busca; erro = tom `danger`, papel `alert`, sem detalhes técnicos, com "Try again" que repete a mesma consulta e recomeça do estado de carregando. Recargas depois da primeira mantêm a lista anterior com `aria-busy`.
- Tokens e diretrizes visuais aprovados: `styles/tokens.css` é a única fonte de cores, espaçamento (4/8/12/16/24/32/48), tipografia, raios, sombras, `--tap-size` (44px) e o anel de foco; componentes usam só `var(--...)` (sem cores literais). Estilos escopados no `<style>` de cada componente, mobile-first com `min-width` em 640px e 1024px (literais, pois variáveis não valem em `@media`). Fonte do sistema, foco visível global em `base.css`, `.visually-hidden` para texto só de leitor de tela. Um teste verifica o contraste WCAG dos pares de token (4,5:1 texto, 3:1 foco). Lista: cartões abaixo de 640px, tabela a partir de 640px, marca e SKU a partir de 1024px.
- Estilo dos testes: Vitest + Testing Library (`fireEvent`, sem `user-event`), consultas por papel e nome acessível. `http-client` e páginas com fake timers e `fetch`/API falsos, RNG injetado e promessas controladas à mão (`deferred`) para ordem de respostas; sem esperas reais. Ajudante `src/test/snippet.ts` para passar `children`. CSS responsivo não é verificável em jsdom, então layout é conferido em navegador real. Foi verificado em Electron (Cypress) em 360, 768 e 1280px com um spec descartável; o e2e permanente é da T7.
- Ajustes pedidos na revisão: nenhum; padrões aprovados como implementados. Decisões acrescentadas na implementação: roteador próprio (uma rota, sem dependência nova; a T6 o estende com rotas parametrizadas); tabela e cartões renderizados em dobro com `display: none` alternando (mantém a semântica de tabela); faixas de estoque do `StockBadge` (0 esgotado, 1–10 baixo, acima de 10 em estoque) são escolha de apresentação, não do contrato; no Vitest o `tokens.css` só é legível com `css.include` configurado.
