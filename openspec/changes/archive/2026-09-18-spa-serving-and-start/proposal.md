# Proposal

## Why

API e SPA estão prontas (T1–T6), mas hoje só rodam em modo de desenvolvimento, com dois processos e duas portas. O enunciado exige que o avaliador clone o repositório, siga instruções curtas e chegue a uma página funcional. A T7 entrega isso: um comando (`npm start`) que compila tudo e sobe **um** servidor, em `http://localhost:3000`, servindo a API e a SPA.

**Decisão do usuário (2026-09-18): não haverá testes e2e nem Cypress.** O escopo original da T7 (Cypress, smoke mobile, `test:e2e`) foi descartado; a T7 fica só com servir a SPA e o `npm start`. O que de e2e deixa de existir será listado no README como não feito. Os arquivos e a dependência do Cypress ficam como estão.

## What Changes

- **Servir a SPA pelo Express**: os arquivos de `apps/web/dist` são servidos como estáticos e qualquer `GET`/`HEAD` de caminho sem extensão que não seja da API nem `/health` recebe o `index.html` (fallback para as rotas da SPA, como `/products/7`). Pedido de arquivo inexistente (com extensão) e qualquer rota sob `/api` continuam respondendo `404` `NOT_FOUND` em JSON.
- **Sem build da SPA, só API**: se `apps/web/dist/index.html` não existe, o servidor sobe assim mesmo, só com a API, e avisa no log (é o caso do `npm run dev`, em que a SPA vem do Vite).
- **`npm start`** na raiz: `npm run build && node apps/api/dist/server.js`. Compila a API e a SPA, aplica as migrations, roda o seed idempotente e sobe o servidor na porta 3000. Sem sintaxe de shell específica.
- **`npm run dev`** já existe (API com reload + Vite com proxy) e não muda.

**Fora de escopo**: qualquer teste e2e ou Cypress (descartado), CI, Docker, `helmet`/CORS, cache agressivo de assets, compressão, `NODE_ENV=production` no `start` (exigiria `cross-env`, dependência nova), README final (T8).

## Capabilities

### New Capabilities

- `spa-serving`: o servidor entrega a SPA compilada e o fallback das rotas do cliente, sem interferir na API nem no `/health`.

### Modified Capabilities

- `api-error-handling`: "Rota inexistente" passa a distinguir a API (sempre `404` JSON) do resto, que recebe a SPA quando ela está compilada.
- `monorepo-workspace`: os scripts de raiz passam a incluir `start`.

## Impact

- **Código**: `apps/api` (`config/paths.ts`, `app.ts`, uma middleware nova `spa.ts`, `server.ts`), `package.json` da raiz (script `start`). Sem alteração em `apps/web` nem em `packages/shared`. **Sem novas dependências** (`express.static` e `res.sendFile` já vêm com o Express).
- **Comportamento observável**: em `http://localhost:3000`, `/` e `/products/7` abrem a SPA; `/api/...` e `/health` seguem como antes.
- **Riscos**: o bundle da API só funciona rodado de dentro do repositório (caminhos derivados de onde o código está, como já era); a renderização do bundle de produção da SPA num navegador é conferida manualmente pelo usuário, já que não há teste de navegador.
