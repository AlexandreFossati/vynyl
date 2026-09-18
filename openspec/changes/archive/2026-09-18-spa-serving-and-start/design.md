# Design

## Context

Estado após a T6: `npm run build` já gera `apps/api/dist/server.js` (tsup, com o pacote `shared` embutido e as demais dependências externas) e `apps/web/dist` (Vite); `npm run dev` roda API e Vite juntos. O `createApp` monta: log → `/health` → limite de requisições em `/api` → JSON → `/api/products` → 404 → error handler. Os caminhos do repositório vêm de onde o código está (`getPaths(import.meta.url)`; o `dist/server.js` fica três níveis abaixo da raiz, como o `src/server.ts`). Guia: seção 4 (Express serve os estáticos e faz fallback para `index.html` fora de `/api`) e seção 9 (`npm start`). **Não há testes e2e nem Cypress** (decisão do usuário).

## Goals / Non-Goals

**Goals:** um comando (`npm start`) que compila e serve API e SPA em uma porta; rotas do cliente funcionando ao recarregar; API e `/health` intocados.
**Non-Goals:** e2e/Cypress, CI, Docker, `helmet`/CORS, compressão, cache agressivo, `NODE_ENV=production`, README (T8), mudanças em `apps/web` e `packages/shared`.

## Decisions

### D1. Middleware `middleware/spa.ts`, ligado por dependência opcional
`createSpaMiddleware({ dir })` devolve dois handlers: `express.static(dir, { index: false })` e o fallback. Segue o padrão da API (função fábrica com dependência por parâmetro, sem singleton). `createApp` ganha `spaDir?: string | undefined` em `AppDependencies`; quando presente, os handlers entram **depois** de `/api/products` e **antes** do `notFoundHandler`. Sem `spaDir` (testes existentes, ou SPA não compilada) nada muda. `index: false` faz `/` passar pelo mesmo caminho do fallback, então há uma só forma de entregar o `index.html`.

### D2. Regra do fallback
Responde `res.sendFile(<dir>/index.html)` quando **todas** as condições valem: método `GET` ou `HEAD`; o caminho não é `/api` nem começa por `/api/`; não é `/health` nem começa por `/health/`; e não tem extensão (`path.extname` vazio). Caso contrário chama `next()` e o `notFoundHandler` responde `404` `NOT_FOUND` em JSON. Motivos: rota desconhecida da API nunca vira HTML (o cliente HTTP da SPA espera o envelope de erro); um arquivo estático inexistente (`/assets/x.js`) deve ser `404` e não uma página HTML com `200` (esconderia um build quebrado); `POST` fora da API não é rota da SPA. As rotas da SPA não têm ponto no caminho (`/products/7/edit`); a rota `/products/1.5` é atendida como "não encontrado" pela própria SPA? Não: tem extensão `.5`, então recebe `404` JSON. Aceito: é um id inválido de qualquer forma.

### D3. Estáticos, segurança e cache
`express.static` já ignora arquivos com ponto (`dotfiles: 'ignore'`), bloqueia `..` (inclusive codificado) e deixa passar métodos que não são `GET`/`HEAD`. O cache fica no padrão (`ETag` + `max-age=0`, revalidação com `304`): os arquivos do Vite têm hash no nome, mas não vale complicar. Os estáticos ficam **fora** do limitador de `/api` (que só cobre `/api`).

### D4. Detecção da SPA no `server.ts`
`paths` ganha `webDistDir` (`<raiz>/apps/web/dist`). Na inicialização, se `<webDistDir>/index.html` existe, passa `spaDir` ao `createApp`; senão registra `logger.warn('SPA build not found; serving the API only')` e segue só com a API. Assim `npm run dev` (Vite serve a SPA) não exige build e não quebra, e `npm start` (que sempre compila antes) serve tudo. O `server.ts` é a raiz de composição e não tem teste unitário (padrão desde a T2); é verificado rodando de verdade (D6).

### D5. `npm start`
Script da raiz: `"start": "npm run build && node apps/api/dist/server.js"`. `&&` funciona no `cmd` do Windows, no PowerShell (via npm) e em shells POSIX, então nenhum utilitário extra é necessário. `npm run build` compila os workspaces em ordem (`shared` sem build, `api`, `web`); se falhar, o `&&` impede o servidor de subir e o comando sai com código diferente de 0. O servidor aplica migrations, roda o seed idempotente e escuta em `PORT` (padrão 3000). **`NODE_ENV`** continua no padrão do config (`development`): defini-lo exigiria `cross-env` (dependência nova) e só muda o campo `env` do log de inicialização, então fica registrado como limitação.

### D6. Testes e verificação (sem e2e)
- **Testes da API** (Supertest sobre `createApp`, com uma pasta temporária contendo `index.html`, `assets/app.js` e um arquivo "secreto" fora dela; `createTestApp` ganha a opção `spaDir`): `/` e `/products/7/edit` devolvem o `index.html`; `HEAD` funciona; `/assets/app.js` é servido; `/assets/x.js` e `/favicon.ico` inexistentes → `404` JSON; `/api/does-not-exist` → `404` JSON (não HTML); `/api/products` e `/health` como antes; `POST /products/7` → `404` JSON; `%2e%2e` não entrega o arquivo de fora; sem `spaDir`, `/` → `404` JSON (comportamento atual); os estáticos não consomem o limite de `/api`. Teste de `getPaths` para `webDistDir`.
- **Execução real**: `npm start` a partir de um checkout sem `dist`, com banco temporário (`DATABASE_PATH`), e conferência por `curl` de `/`, `/products/7`, um asset referenciado pelo HTML, um asset inexistente, `/api/products`, `/api/nada`, `/health`; depois o servidor sem `apps/web/dist` (aviso no log, `/` → `404`); e um **clone limpo** (`git clone` em caminho curto, `npm ci`, `npm start`) para o critério "clone limpo → `npm install` + `npm start`". Não há navegador nesta verificação: a renderização do bundle de produção fica para o usuário abrir e conferir.

## Risks / Trade-offs

- **O bundle depende do repositório** (migrations, dataset e `apps/web/dist` são lidos pelo caminho relativo ao código) → é como já funcionava; `npm start` roda de dentro do clone.
- **`npm start` compila a cada vez** (uns segundos) → simples e sempre coerente com o código, em vez de um cache de build que pode ficar velho.
- **Sem teste de navegador do bundle de produção** → o mesmo código já foi exercitado no Vite em navegador real (T5/T6); o que muda aqui é só a entrega dos arquivos, coberta por testes de rota e `curl`. A conferência visual é do usuário.
- **`/products/1.5` recebe `404` JSON** (tem "extensão") em vez da página "não encontrado" da SPA → aceitável.

## Migration Plan

Sem migração. Reversão: reverter o commit.

## Open Questions

Nenhuma.
