# Proposal

## Why

A API está completa e operável (T1–T4), mas a SPA ainda é um `<h1>`. A T5 é a **tarefa-modelo do frontend**: entrega a base visual, o REST client resiliente (a metade de frontend da **feature extra** de resiliência) e a primeira tela real, o dashboard de produtos. Os padrões definidos aqui (níveis de componentes, acesso a dados nas páginas, estados, tokens, estilo de testes) serão aprovados pelo usuário e replicados na T6, então o objetivo é acertar o padrão, não cobrir telas.

## What Changes

- **Base visual**: `styles/tokens.css` (única fonte de cores, espaçamento, tipografia, raios e sombras) e `styles/base.css` (reset leve, fonte do sistema, foco visível, alvos de toque de 44 px). Mobile-first, breakpoints 640 e 1024 px. CSS puro, sem biblioteca de UI.
- **REST client** (`lib/api/http-client.ts`): timeout por tentativa, cancelamento, retry só em métodos idempotentes e só em erro de rede/timeout/408/429/502/503/504, backoff exponencial com full jitter, respeito ao `Retry-After`, `ApiError` tipado. `products-api` com a listagem, validando a resposta com o schema compartilhado.
- **Componentes Atomic Design**, somente os que o dashboard usa: átomos (Button, Input, Badge, Spinner), moléculas (SearchBox, Pagination, PriceTag, StockBadge, StatusMessage), organismos (Header, ProductList com tabela no desktop e cartões no mobile), template (AppShell) e página (DashboardPage, NotFoundPage).
- **Dashboard** (`/`): lista os produtos reais da API, busca com debounce, paginação de 30 por página, estados de carregando, vazio e erro (com "Try again"), sem scroll horizontal em 360, 768 e 1280 px.
- **Roteamento mínimo** próprio sobre a History API (rota `/` e página de não encontrado) e **proxy do Vite** para `/api` no desenvolvimento.
- **Regra de lint** que impede componentes abaixo de `pages` de importar de `lib/api` (critério de aceite da tarefa).

**Fora de escopo**: detalhe, criar, editar e excluir produtos (T6), toasts, diálogos, modo escuro, animações elaboradas, servir a SPA pelo Express (T7), Cypress e2e (T7).

## Capabilities

### New Capabilities

- `web-design-foundation`: tokens, estilos base, responsividade, foco, alvos de toque e contraste.
- `web-http-client`: REST client com timeout, cancelamento, retry com backoff e erros tipados, e a API de produtos (listagem).
- `product-dashboard`: tela inicial com lista, busca com debounce, paginação e estados.
- `web-app-structure`: roteamento mínimo, proxy de desenvolvimento e fronteiras entre os níveis de componentes.

### Modified Capabilities

Nenhuma.

## Impact

- **Código**: `apps/web/src` (estilos, `lib/api`, `lib/router`, componentes, `App.svelte`, `main.ts`), `apps/web/vite.config.ts` e o `eslint.config.js` da raiz (uma regra). Sem novas dependências: Svelte 5, Testing Library, jsdom e Vitest já estão instalados.
- **Comportamento observável**: `npm run dev` passa a mostrar o catálogo real em `http://localhost:5173` (com a API em `3000`).
- **Riscos**: a estética é subjetiva e é o foco da revisão do usuário; a verificação de layout usa screenshots reais em um navegador (Electron do Cypress), não todos os navegadores.
