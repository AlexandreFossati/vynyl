# Tasks

> Referências: specs em `specs/` (`web-design-foundation`, `web-http-client`, `product-dashboard`, `web-app-structure`); decisões em `design.md` (D1–D10); regras de UI no guia (seções 10 e 11.1). Idioma: código, comentários, textos de interface e testes em **inglês**; estas tasks em português. **Não fazer commit nem arquivar** (o usuário revisa antes). **Nenhuma dependência nova.** Temporários de verificação no scratchpad. Testes seguem a Definition of Done do `CLAUDE.md`.

## 1. Base visual e proxy

- [x] 1.1 Criar `apps/web/src/styles/tokens.css` e `base.css` (D7) e importá-los uma vez em `main.ts`; teste `styles/tokens.test.ts` que lê `tokens.css` e verifica a razão de contraste WCAG (>= 4.5:1 para os pares de texto, >= 3:1 para o anel de foco). Verificar com os testes do `web`.
- [x] 1.2 Configurar o proxy de `/api` → `http://localhost:3000` no `vite.config.ts` (D-spec `web-app-structure`). Verificar em 8.1 com a API real.

## 2. REST client

- [x] 2.1 Criar `lib/api/api-error.ts` e `lib/api/http-client.ts` (D3) com testes (fake timers, `fetch` falso, `random` injetado): consulta e corpo JSON, `204`, envelope de erro, resposta sem envelope, falha de rede, `INVALID_RESPONSE`, timeout, abort durante a requisição e durante o backoff, retry até o sucesso, tentativas esgotadas, `POST`/`PATCH` sem repetição, `400`/`404` sem repetição, `Retry-After` (segundos, data, acima do teto), backoff 300/600/1200 ms com `random = 1`, teto, jitter com `random = 0.5`. Verificar com os testes do `web`.
- [x] 2.2 Criar `lib/api/products-api.ts` (D4) com testes: parâmetros enviados (com e sem `q`), sinal repassado, resposta válida, resposta fora do contrato → `INVALID_RESPONSE`. Verificar com os testes do `web`.

## 3. Roteamento e fronteira de componentes

- [x] 3.1 Criar `lib/router.svelte.ts` (D1) e a regra de lint da fronteira `lib/api` (D8) no `eslint.config.js`. Verificar a regra de fato: uma violação temporária num átomo deve falhar o `npm run lint` e um import em `pages` deve passar; remover a violação. Os testes do roteador ficam na task 7.1 (via `App`).

## 4. Átomos

- [x] 4.1 Criar `Button`, `Input`, `Badge` e `Spinner` em `components/atoms` (D2, D7): só props/eventos e tokens; altura mínima de 44 px em `Button` e `Input`; `Spinner` com `role="status"`/rótulo acessível ou marcado como decorativo conforme o uso. Testes de renderização e de eventos para `Button` e `Input`. Verificar com os testes do `web` e o `typecheck`.

## 5. Moléculas

- [x] 5.1 Criar `SearchBox` (debounce de 300 ms, D6), `Pagination`, `PriceTag`, `StockBadge` e `StatusMessage` em `components/molecules`, com testes: `SearchBox` (uma chamada após a pausa, nenhuma antes, texto completo, `maxlength`), `Pagination` (intervalo exibido, limites desabilitados, callbacks, catálogo vazio), `StockBadge` (0, 1, 10, 11), `PriceTag` (`$1,299.00`, `$9.99`), `StatusMessage` (papel `alert` no perigo, ação chamada, `busy` mostra o spinner). Verificar com os testes do `web`.

## 6. Organismos e template

- [x] 6.1 Criar `Header` e `ProductList` em `components/organisms` e `AppShell` em `components/templates` (D2, D7), com testes de `ProductList`: uma linha da tabela e um cartão por produto com título, marca, categoria formatada, preço e selo de estoque; legenda e cabeçalhos da tabela; `aria-busy` quando `busy`. Verificar com os testes do `web` e o `typecheck`.

## 7. Páginas e aplicação

- [x] 7.1 Criar `DashboardPage` e `NotFoundPage` em `components/pages` (D5) e ligar `App.svelte` ao roteador e ao `AppShell`, com testes: `DashboardPage` com `api` falsa (primeira página com `limit=30&offset=0` sem `q`; busca gera uma só requisição com o texto e `offset=0`; `Next` pede `offset=30`; busca vazia omite `q`; vazio com "Clear search"; erro com "Try again"; respostas fora de ordem; recarga mantém a lista com `aria-busy`); `App` (`/` mostra o dashboard, caminho desconhecido mostra o não encontrado, "Back to products" navega sem recarregar, `popstate`). Verificar com os testes do `web` e o `typecheck`.

## 8. Verificação e fechamento

- [x] 8.1 Verificação em navegador real (D10): API real com banco temporário + Vite com proxy + spec Cypress temporário no scratchpad, em 360, 768 e 1280 px: lista os 44 produtos reais em 2 páginas (30 + 14), busca com debounce (um pedido por digitação rápida), paginação, sem rolagem horizontal, apresentação correta (cartões no mobile, tabela a partir de 640, marca e SKU a partir de 1024), foco visível, estado vazio e estado de erro (API parada); ler os screenshots. Declarar o que não foi verificável.
- [x] 8.2 Executar na raiz `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npm run format` (duas vezes, idempotente); conferir o escopo (`package.json`/lockfile sem alteração, sem `console.*`/TODO, sem cores literais nos componentes, nenhum componente abaixo de `pages` importa `lib/api`, sem temporários); `openspec validate web-foundation-dashboard --strict`; refletir no `OPENSPEC_TASKS.md` só os itens de escopo e de aceite da T5 realmente verificados (deixar "Revisão do usuário", "Padrões do frontend" e "Commit feito" abertos); entregar o relatório com o que **não** foi verificado. **Parar antes do commit.**
