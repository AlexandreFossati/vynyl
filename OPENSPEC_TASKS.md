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
- [ ] **T1** `scaffold-monorepo` — estrutura vazia + tooling + schema/migration + data set · P0 · checkpoint: 1º commit da estrutura
- [ ] **T2** `api-list-products` — **primeiro endpoint completo** (`GET /api/products`) com toda a fundação e testes · P0 · **checkpoint: define o padrão da API**
- [ ] **T3** `api-products-remaining` — demais endpoints obrigatórios seguindo o padrão · P0
- [ ] **T4** `api-operability-and-scale` — rate limit, `/health`, graceful shutdown, singleflight · P1
- [ ] **T5** `web-foundation-dashboard` — design system mínimo + REST client (retry/backoff) + **primeira página** · P0/P1 · **checkpoint: define o padrão do frontend**
- [ ] **T6** `web-product-pages` — detalhe, criar, editar, excluir · P0
- [ ] **T7** `e2e-and-serving` — Express serve a SPA, `npm start`, Cypress · P0
- [ ] **T8** `docs-readme-ai` — README.md e AI.md finais, verificação em clone limpo · P0
- [ ] **T9** `optional-endpoints` — ordenação e categorias · P2 · só se sobrar tempo

**Padrões aprovados** (seção no fim deste arquivo)
- [ ] Padrões da API registrados (após a revisão de T2)
- [ ] Padrões do frontend registrados (após a revisão de T5)

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
- [ ] Raiz: `package.json` (workspaces + scripts multiplataforma `lint`, `typecheck`, `test`, `format`, `build`, `dev`), `.nvmrc` + `engines`, `.gitignore` (inclui `data/*.db`, `.env`, `dist`), `.env.example`, `tsconfig.base.json` (strict), config de ESLint e Prettier
- [ ] `packages/shared`: `package.json`, `tsconfig`, entrada placeholder
- [ ] `apps/api`: `package.json`, `tsconfig`, config do Vitest, `drizzle.config.ts`, **pastas vazias das camadas** (`routes`, `handlers`, `services`, `repositories`, `mappers`, `db`, `middleware`, `lib`, `config`) com `.gitkeep`, entrada placeholder
- [ ] `apps/web`: Vite + Svelte 5 + TS, `svelte-check`, config do Vitest + Testing Library, `index.html`, `main.ts` e um `App.svelte` mínimo que só renderiza o título (prova que a toolchain funciona), **pastas do Atomic Design** (`atoms`, `molecules`, `organisms`, `templates`, `pages`), `lib/api`, `styles`, config do Cypress (`cypress.config.ts` sem specs)
- [ ] Dependências já decididas no guia (seção 2) instaladas, `package-lock.json` fechado e **instalação validada em Windows** (em especial `better-sqlite3` e Cypress)
- [ ] **Banco**: `db/schema.ts` com a tabela `products` conforme seção 5 do guia; migration inicial gerada por drizzle-kit e versionada em `apps/api/drizzle/`; script `db:generate`
- [ ] **Data set**: `data/products.json` no formato do template, **40+ produtos**, JSON válido, `id` sequenciais, SKUs únicos (`^[A-Z0-9-]+$`), valores dentro das regras da seção 6, múltiplas categorias e marcas. Os dois primeiros itens são os do PDF (Large e Medium Flux Capacitor)

**Fora de escopo**: app Express, handlers, schemas Zod, seed, config/logger, componentes, tokens de design, CI, README final.

**Critérios de aceite / verificação**
- [ ] Clone limpo → `npm install` conclui sem erro no Windows, com Node do `.nvmrc`
- [ ] `npm run lint`, `npm run typecheck` e `npm test` passam (sem testes ainda: o runner não deve falhar por ausência deles)
- [ ] `npm run dev` no `apps/web` serve a página placeholder
- [ ] A migration aplicada num SQLite temporário cria a tabela com PK, `sku` unique e índice em `category` (verificar com um comando pontual, sem criar código)
- [ ] `data/products.json` validado com um comando pontual: JSON válido, 40+ itens, `id` e `sku` únicos, todas as regras da seção 6
- [ ] Estrutura de pastas idêntica à seção 3 do guia

**Fechamento**
- [ ] Revisão do usuário: estrutura de pastas, scripts, dependências instaladas, schema/migration, qualidade do data set
- [ ] Commit feito: `chore: scaffold monorepo, database schema and dataset`
- [ ] Anotações para o `AI.md` registradas

---

## T2 — `api-list-products` (tarefa-modelo do backend)

**Descrição do change**: Implementar de ponta a ponta o endpoint `GET /api/products` (lista com paginação e busca), incluindo toda a fundação do backend e testes. O resultado define o padrão que os demais endpoints seguirão.

**Escopo (inclui)**
- [ ] **`packages/shared`**: schema do produto (resposta), schema de entrada usado para validar o data set no seed, schema da query de listagem (`limit` padrão 30, máx. 100, `offset` padrão 0, `q` opcional com trim), tipo da resposta paginada `{ data, total, limit, offset }`, enum de códigos de erro e schema do envelope de erro, constantes (limites)
- [ ] **Config**: env validada com Zod (porta, caminho do DB, nível de log); falha rápida no boot
- [ ] **Logger**: pino + request id (`pino-http`), sem dados sensíveis
- [ ] **DB**: conexão better-sqlite3 com pragmas (WAL, foreign keys, busy timeout); migrations aplicadas programaticamente no start; **seed idempotente** a partir de `data/products.json` (valida com Zod, converte preço para centavos, só insere se a tabela estiver vazia)
- [ ] **Camadas** (uma por arquivo, seguindo a seção 4): `routes`, `handlers`, `services`, `repositories` (consulta com `LIKE` escapado em `title`/`description`, contagem total, ordenação `id ASC`), `mappers` (linha ↔ DTO, centavos ↔ decimal, `meta`)
- [ ] **Middleware**: `validate` (Zod para query/params/body), **error handler central** + `AppError` (códigos da seção 7), 404 para rota inexistente
- [ ] `createApp(deps)` e `server.ts` (listen). Sem graceful shutdown ainda (T4)
- [ ] **Testes** (Vitest): mapper; service com repository falso; repository contra SQLite em memória com migrations; rotas via Supertest; config inválida; seed idempotente

**Fora de escopo**: demais endpoints, rate limit, `/health`, graceful shutdown, singleflight, frontend, serving da SPA.

**Decisões fixadas neste change**
- `limit > 100` ou valores inválidos → **400 `VALIDATION_ERROR`** (não truncar em silêncio).
- Busca com `%` e `_` no termo é tratada literalmente (escape).
- Resposta da listagem no formato `{ data, total, limit, offset }`.

**Critérios de aceite / verificação**
- [ ] `GET /api/products` retorna 30 itens por padrão com o seed de 40+; `limit`/`offset` funcionam; `total` correto
- [ ] `q` é case-insensitive e busca em título **e** descrição; `%`/`_` não viram curinga
- [ ] Entradas inválidas (`limit=0`, `limit=101`, `offset=-1`, `limit=abc`) → 400 no formato de erro padronizado; rota inexistente → 404 `NOT_FOUND`; erro inesperado → 500 sem vazar detalhes
- [ ] Reiniciar o servidor não duplica o seed
- [ ] Lint, typecheck e testes passam
- [ ] O agente **executou o servidor e chamou o endpoint** (não só testes) e mostrou o resultado

**Fechamento**
- [ ] Revisão do usuário (**checkpoint importante**): separação das camadas, nomes, injeção de dependências, estilo dos testes, formato de erro, organização dos schemas em `shared`, uso de logs. **Tudo que for ajustado aqui vira padrão**
- [ ] Padrões da API registrados na seção "Padrões aprovados"
- [ ] Commit feito: `feat(api): add paginated product listing with search`
- [ ] Anotações para o `AI.md` registradas

---

## T3 — `api-products-remaining`

**Descrição do change**: Implementar os demais endpoints obrigatórios (`GET /api/products/:id`, `POST`, `PATCH`, `DELETE`) **seguindo estritamente os padrões aprovados em T2**, com testes.

**Escopo (inclui)**
- [ ] `GET /api/products/:id` → 200 / 404 `PRODUCT_NOT_FOUND`; `id` inválido → 400
- [ ] `POST /api/products` → 201 + header `Location`; body validado (schema estrito, `meta` e `id` não aceitos); SKU duplicado → 409 `SKU_CONFLICT`
- [ ] `PATCH /api/products/:id` → atualização **parcial** (ao menos um campo), atualiza `meta.updatedAt`; 404; 409 se alterar para SKU existente
- [ ] `DELETE /api/products/:id` → 204 / 404 (hard delete)
- [ ] Schemas de criação/atualização em `shared`; conversão de preço para centavos **sem erro de ponto flutuante** (ex.: `19.99`)
- [ ] **Conflito de SKU** tratado pela constraint `unique` do banco (traduzindo o erro em erro de domínio), **não** por "verificar e depois inserir" (evita condição de corrida)
- [ ] Testes por camada e por rota (felizes, validação, 404, 409, campos extras rejeitados, `updatedAt` mudando, `createdAt` intacto)

**Fora de escopo**: qualquer novo padrão; rate limit, singleflight, health (T4); frontend.

**Critérios de aceite**
- [ ] Todos os endpoints respondem conforme a seção 7 do guia; regras da seção 6 aplicadas
- [ ] Nenhum desvio do padrão de T2 sem aprovação
- [ ] Lint, typecheck e testes passam
- [ ] O agente exercitou os endpoints com o servidor rodando

**Fechamento**
- [ ] Revisão do usuário: consistência com T2, cobertura de erros
- [ ] Commit feito: `feat(api): add product get, create, update and delete endpoints`
- [ ] Anotações para o `AI.md` registradas

---

## T4 — `api-operability-and-scale` (feature extra, parte backend)

**Descrição do change**: Adicionar rate limiting, endpoint de saúde, graceful shutdown e o singleflight nas leituras.

**Escopo (inclui)**
- [ ] **Rate limit** (`express-rate-limit`) em `/api`, configurável por env (padrão sugerido: 100 req/min/IP), cabeçalhos padrão, 429 `RATE_LIMITED` no formato de erro + `Retry-After`; `trust proxy` via config
- [ ] **`GET /health`** fora de `/api` e do rate limit; 200 se o DB responde, 503 caso contrário
- [ ] **Graceful shutdown**: SIGINT/SIGTERM param de aceitar conexões, aguardam as em andamento (com timeout), fecham servidor e DB
- [ ] **Singleflight** (`lib/singleflight.ts`) conforme seção 11.2 do guia, aplicado no **service** às leituras (`get by id` e `list`), nunca às escritas; sem cache
- [ ] Testes: rate limit (janela pequena via config), health (ok e falha do DB), shutdown (lógica testável), singleflight (N callers concorrentes → loader executa 1 vez; chaves diferentes não colapsam; erro compartilhado; chave liberada após concluir; nova chamada após concluir executa de novo; loader assíncrono simulado)
- [ ] **Limitação documentada** no código e no relatório (guia, seção 11.3): better-sqlite3 é síncrono, então em runtime não haverá coalescência real. O agente **não deve** alegar que o singleflight reduz consultas com este driver

**Fora de escopo**: trocar de driver, cache, métricas, helmet.

**Critérios de aceite**
- [ ] 429 ocorre ao exceder o limite e volta ao normal depois
- [ ] `/health` correto (200 e 503)
- [ ] Encerramento limpo sem conexões penduradas
- [ ] Testes do singleflight passam
- [ ] Lint, typecheck e testes verdes

**Fechamento**
- [ ] Revisão do usuário
- [ ] Commit feito: `feat(api): add rate limiting, health check, graceful shutdown and singleflight`
- [ ] Anotações para o `AI.md` registradas

---

## T5 — `web-foundation-dashboard` (tarefa-modelo do frontend)

**Descrição do change**: Criar a base visual (tokens e estilos), os componentes Atomic Design necessários, o REST client com retry/backoff e a primeira página (dashboard com lista de produtos, busca e paginação), responsiva. Define o padrão do frontend.

**Escopo (inclui)**
- [ ] `styles/tokens.css` e `base.css` conforme **seção 10.2** (clean, simples, mobile-first, breakpoints 640/1024, alvos de toque ≥ 44 px, fonte do sistema)
- [ ] Componentes **somente os que o dashboard usa**, nos níveis corretos: átomos (Button, Input, Badge, Spinner...), moléculas (SearchBox, Pagination, PriceTag, StockBadge...), organismos (Header, ProductList com tabela no desktop e cards no mobile), template (AppShell/PageLayout), página (DashboardPage). Estados de carregando, vazio e erro (com tentar novamente)
- [ ] **REST client** (`lib/api/http-client.ts`) conforme **seção 11.1**: timeout, cancelamento, retry só em métodos idempotentes e nas condições definidas (rede, 408, 429, 502, 503, 504), backoff exponencial com jitter, `Retry-After`, `ApiError` tipado; `products-api` com a listagem
- [ ] Roteamento mínimo (rota `/`); biblioteca validada (compatível com Svelte 5) ou fallback próprio
- [ ] Proxy do Vite para `/api` (dev)
- [ ] Testes: `http-client` completo (fake timers, RNG injetado); componentes principais (SearchBox, Pagination, ProductList) com Testing Library

**Fora de escopo**: detalhe/criar/editar/excluir (T6), toasts, diálogos, modo escuro, animações elaboradas.

**Critérios de aceite / verificação**
- [ ] Dashboard lista produtos reais da API, busca com debounce, paginação de 30 por página
- [ ] Layout sem quebra e sem scroll horizontal em **360, 768 e 1280 px** (o agente verifica de fato, por exemplo com screenshots via navegador; se não puder, diz explicitamente que não verificou)
- [ ] Tabela vira cards no mobile; foco visível; contraste adequado
- [ ] Nenhum componente abaixo de `pages` importa de `lib/api`
- [ ] Lint, typecheck e testes verdes

**Fechamento**
- [ ] Revisão do usuário (**checkpoint importante**): **estética**, granularidade dos componentes, organização Atomic Design, estilo dos testes
- [ ] Padrões do frontend registrados na seção "Padrões aprovados"
- [ ] Commit feito: `feat(web): add design foundation, http client and product dashboard`
- [ ] Anotações para o `AI.md` registradas

---

## T6 — `web-product-pages`

**Descrição do change**: Implementar detalhe, criação, edição e exclusão de produtos na SPA, seguindo os padrões aprovados em T5.

**Escopo (inclui)**
- [ ] Rotas e páginas: detalhe, criar, editar
- [ ] `ProductForm` compartilhado (criar/editar) com validação pelo **mesmo schema Zod de `shared`**, erros por campo, SKU duplicado (409) exibido no campo, botão desabilitado durante envio, duas colunas no desktop e uma no mobile
- [ ] Exclusão com `ConfirmDialog` (tela cheia no mobile, foco gerenciado, tecla Esc)
- [ ] Toasts de sucesso/erro; navegação coerente após cada ação; tratamento de 404 (produto inexistente)
- [ ] `products-api` estendido (get, create, update, delete), respeitando a regra de não repetir POST
- [ ] Testes de componentes e páginas principais

**Fora de escopo**: qualquer feature nova de UI; e2e (T7).

**Critérios de aceite**
- [ ] CRUD completo pela UI contra a API real
- [ ] Validações client e server refletidas
- [ ] Responsivo em 360/768/1280
- [ ] Acessibilidade básica (labels, foco, `aria-live`)
- [ ] Lint, typecheck e testes verdes

**Fechamento**
- [ ] Revisão do usuário
- [ ] Commit feito: `feat(web): add product detail, create, edit and delete flows`
- [ ] Anotações para o `AI.md` registradas

---

## T7 — `e2e-and-serving`

**Descrição do change**: Fazer o Express servir a SPA compilada, implementar o `npm start` de um comando e adicionar os testes e2e com Cypress.

**Escopo (inclui)**
- [ ] Express serve `apps/web/dist` com fallback para `index.html` (exceto `/api` e `/health`)
- [ ] **`npm start`**: build de `shared`, `api` e `web`, migrations, seed idempotente e servidor em **http://localhost:3000**. `npm run dev` (API com reload + Vite com proxy). Forma de build mais simples e multiplataforma escolhida e documentada no design (guia, seção 15, item 5)
- [ ] **Cypress e2e** contra o servidor real com DB temporário (`DATABASE_PATH`): listar, buscar, paginar, criar, editar, excluir, erro de validação/SKU duplicado
- [ ] **1 smoke em viewport mobile**
- [ ] Script `test:e2e` que sobe e derruba o servidor de forma multiplataforma

**Fora de escopo**: CI (ver guia, seção 15), Docker.

**Critérios de aceite**
- [ ] Em clone limpo, `npm install` + `npm start` abre a aplicação funcional em `localhost:3000` no Windows
- [ ] `npm run test:e2e` passa
- [ ] Lint, typecheck e testes verdes

**Fechamento**
- [ ] Revisão do usuário
- [ ] Commit feito: `feat: serve SPA from API, add npm start and Cypress e2e`
- [ ] Anotações para o `AI.md` registradas

---

## T8 — `docs-readme-ai`

**Descrição do change**: Escrever `README.md` e `AI.md` finais e validar tudo em clone limpo.

**Escopo (inclui)**
- [ ] **README.md** conforme seção 14 do guia: visão geral, requisitos (Node LTS), como rodar/testar, scripts, estrutura, decisões de produto, premissas, questões em aberto, **feature extra** (problema, quem usa, por quê, e a limitação do singleflight com better-sqlite3), o que ficou de fora e próximos passos (auth, helmet/CORS, GitHub Actions, opcionais, driver assíncrono)
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

### API (definir após T2)
- Convenção de nomes de arquivos/funções por camada:
- Como as dependências são injetadas:
- Padrão de validação (onde e como):
- Padrão de erros de domínio → resposta HTTP:
- Padrão de logs:
- Estilo dos testes (unit, repository, rota):
- Ajustes pedidos na revisão:

### Frontend (definir após T5)
- Convenção de componentes por nível (Atomic Design):
- Padrão de acesso a dados nas páginas:
- Padrão de estados (carregando/vazio/erro):
- Tokens e diretrizes visuais aprovados:
- Estilo dos testes:
- Ajustes pedidos na revisão:
