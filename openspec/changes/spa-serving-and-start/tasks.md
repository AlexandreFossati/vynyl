# Tasks

> Referências: specs em `specs/` (`spa-serving`, `api-error-handling`, `monorepo-workspace`); decisões em `design.md` (D1–D6); guia seções 4 e 9. Idioma: código, comentários, mensagens de log e testes em **inglês**; estas tasks em português. **Sem e2e e sem Cypress** (decisão do usuário); os arquivos do Cypress ficam como estão. **Nenhuma dependência nova**, nenhuma alteração em `apps/web` nem em `packages/shared`. Seguir os "Padrões aprovados" da API (fábrica com dependência por parâmetro, testes com Supertest sobre `createApp`). Temporários no scratchpad. Testes seguem a Definição de Pronto do `CLAUDE.md`.

## 1. Servir a SPA na API

- [x] 1.1 Adicionar `webDistDir` a `config/paths.ts` (com teste em `paths.test.ts`) e criar `middleware/spa.ts` (D1–D3) ligado em `createApp` por `spaDir` opcional, e a opção `spaDir` em `createTestApp`. Verificar com os testes novos em `app.spa.test.ts` (matriz do D6: `/`, rota do cliente, `HEAD`, asset existente e inexistente, `/api/nada` em JSON, `/api/products` e `/health` intactos, `POST` fora da API, `%2e%2e`, sem `spaDir`, limite de `/api` não consumido) e com os testes existentes da API, que continuam passando.
- [x] 1.2 Ligar o `server.ts` (D4): passar `spaDir` quando `apps/web/dist/index.html` existe e avisar no log quando não existe. Verificar com o `typecheck` e o lint (o `server.ts` não tem teste unitário, D4).

## 2. `npm start`

- [x] 2.1 Adicionar o script `start` à raiz (D5). Verificar rodando `npm start` a partir de um checkout sem `dist`, com banco temporário: o build passa, o log mostra "API listening" e o `curl` da matriz do D6 responde como esperado (`/`, `/products/7`, um asset do HTML, asset inexistente, `/api/products`, `/api/nada`, `/health`); depois com `apps/web/dist` removido (aviso no log, `/` → `404`); e um build quebrado (não é preciso quebrar de verdade: conferir que o `&&` impede o servidor, lendo o script).

## 3. Verificação e fechamento

- [x] 3.1 Clone limpo: `git clone` do repositório (com as mudanças da task 1–2 copiadas, pois ainda não commitadas) para um caminho curto, `npm ci`, `npm start` com banco temporário e o mesmo `curl` do D6; parar o servidor e apagar o clone. Declarar o que não foi verificável (navegador com o bundle de produção).
- [x] 3.2 Executar na raiz `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npm run format` (duas vezes, idempotente); conferir o escopo (`apps/web`, `packages/shared` e o lockfile sem alteração; sem `console.*`/TODO; sem temporários; `data/app.db` intocado); `openspec validate spa-serving-and-start --strict`; refletir no `OPENSPEC_TASKS.md` só os itens da T7 realmente verificados (os itens de Cypress já estão marcados como descartados); entregar o relatório com o que **não** foi verificado.
