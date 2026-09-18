# Design

## Context

Estado após a T4: API completa e operável; `apps/web` tem só o esqueleto (Vite + Svelte 5, `App.svelte` com um `<h1>`, pastas Atomic Design vazias, Vitest com jsdom e Testing Library configurados). Esta é a **tarefa-modelo do frontend**: os padrões daqui serão revisados e replicados na T6. Motivação e escopo: `proposal.md`; requisitos: `specs/`; regras de UI: seção 10 do guia; REST client: seção 11.1.

Fatos verificados: o dataset tem 44 produtos, categorias em minúsculas e com hífen (`dimensional-travel`), preços de 0,99 a 1299 e estoque de 0 a 250; a listagem da API aceita `limit` até 100, `offset` e `q` até 100 caracteres; Svelte 5 já está instalado com `eslint-plugin-svelte` na configuração de lint (então uma regra de importação vale para `.svelte`).

## Goals / Non-Goals

**Goals:** base visual com tokens, REST client resiliente e testado, dashboard responsivo com busca, paginação e estados, padrões claros para a T6.
**Non-Goals:** detalhe/criação/edição/exclusão, toasts, diálogos, modo escuro, animações, estado global, biblioteca de UI, biblioteca de fetching.

## Decisions

### D1. Roteamento próprio mínimo (fallback previsto no guia)
`lib/router.svelte.ts` guarda o caminho atual em um `$state`, expõe `navigate(path)` (`history.pushState`) e escuta `popstate`. O `App.svelte` escolhe a página pelo caminho. Não adotei biblioteca: na T5 há **uma** rota, uma dependência nova custaria mais (manutenção, compatibilidade com Svelte 5) do que as ~20 linhas próprias, e o guia prevê o fallback. **Não avaliei bibliotecas individualmente**; a decisão é por custo/benefício. A T6 estende o mesmo módulo com rotas parametrizadas (`/products/:id`). O fallback do servidor para `index.html` fica para a T7 (o Vite já o faz em desenvolvimento).

### D2. Níveis, componentes e o que cada um sabe
Só entra o que o dashboard usa (guia 10.1); cada componente em um arquivo, `PascalCase`, props tipadas (`$props()`), eventos como *callback props* (`onclick`, `onsearch`, `onpagechange`), sem `createEventDispatcher`.

| Nível | Componentes | Observação |
|---|---|---|
| atoms | `Button` (variantes `primary`/`secondary`), `Input`, `Badge` (tons), `Spinner` | Sem estado de negócio |
| molecules | `SearchBox`, `Pagination`, `PriceTag`, `StockBadge`, `StatusMessage` | `SearchBox` contém o debounce; `StatusMessage` serve a carregando, vazio e erro |
| organisms | `Header`, `ProductList` | `ProductList` renderiza tabela e cartões a partir de `products` |
| templates | `AppShell` | Cabeçalho + conteúdo por *snippets*; só posicionamento |
| pages | `DashboardPage`, `NotFoundPage` | Únicos que importam `lib/api` |

`Header` mostra só o título do app (sem navegação: só há uma tela). `Icon` e `Select` não entram (não são usados).

### D3. REST client (`lib/api/http-client.ts`)
`createHttpClient({ baseUrl = '', timeoutMs = 10_000, retries = 3, baseDelayMs = 300, factor = 2, maxDelayMs = 5_000, fetch = globalThis.fetch, random = Math.random })` devolve `{ request }`. Algoritmo por requisição:
1. Se o sinal do chamador já está abortado, rejeitar com `AbortError`.
2. Para cada tentativa `n = 0..retries`: criar um `AbortController` próprio ligado ao sinal do chamador e a um temporizador de `timeoutMs`; chamar `fetch`. Qualquer rejeição do `fetch` vira `NETWORK_ERROR` (ou `TIMEOUT` se foi o temporizador), exceto se o chamador abortou (aí `AbortError` e fim).
3. `2xx` → `204` devolve `undefined`, senão `response.json()` (falha de parse → `INVALID_RESPONSE`, sem retry). Fora de `2xx` → `ApiError` (envelope validado com `apiErrorSchema` do `shared`; sem envelope → `UNKNOWN`).
4. Se o método é idempotente, o erro é retentável (`NETWORK_ERROR`, `TIMEOUT` ou status 408/429/502/503/504) e ainda há tentativas: esperar e repetir. Espera = `Retry-After` (segundos ou data HTTP) limitado a `maxDelayMs`, ou, sem ele, `random() × min(maxDelayMs, baseDelayMs × factor^n)` (full jitter).
5. A espera é um `setTimeout` que também escuta o sinal do chamador (cancelamento imediato).

`ApiError` (`lib/api/api-error.ts`): `status` (0 sem resposta), `code` (`ErrorCode` do `shared` ou `NETWORK_ERROR | TIMEOUT | INVALID_RESPONSE | UNKNOWN`), `message`, `details?`. **Alternativa descartada**: injetar `sleep` (os fake timers do Vitest bastam e o código de produção fica sem parâmetro só para teste).

### D4. `products-api` (`lib/api/products-api.ts`)
`createProductsApi(http)` → `{ list({ limit, offset, q }, signal) }`; valida a resposta com `productListResponseSchema` (`safeParse`; falha → `ApiError` `INVALID_RESPONSE`). O módulo também exporta a instância `productsApi` (cliente com `baseUrl` vazio, caminhos relativos `/api/...`). O tipo `ProductsApi` é o que as páginas recebem por prop (padrão: a instância real), o que permite testar as páginas com uma API falsa sem mockar módulos.

### D5. Acesso a dados e estados na página
`DashboardPage` (`api` por prop, padrão `productsApi`) guarda `query`, `page`, `result`, `error` e `loading` em runes. Um `$effect` dependente de `query` e `page` dispara a requisição com um `AbortController` novo e devolve, no *cleanup*, `abort()`: assim a requisição anterior é cancelada e nenhuma resposta antiga é aplicada. O `AbortError` é ignorado; qualquer outro erro vira o estado de erro. Estados: sem `result` e carregando → `StatusMessage` com `busy`; erro → `StatusMessage` de perigo com "Try again" (que incrementa um contador que o efeito lê, repetindo a mesma consulta); `result.total === 0` → vazio (com "Clear search" se há `query`); senão `ProductList` + `Pagination`. Recargas depois da primeira mantêm a lista anterior com `aria-busy` e opacidade reduzida (sem piscar). Mudar a busca redefine `page` para 1 no mesmo tick (uma só requisição).

### D6. Debounce no `SearchBox`
O átomo `Input` é controlado (`value` com `bind`); o `SearchBox` mantém o texto digitado e, a cada mudança, reinicia um `setTimeout` de 300 ms que chama `onsearch(texto)`; o *cleanup* limpa o temporizador. O texto é limitado por `maxlength=100`; a página faz `trim` e trata vazio como sem `q`. O debounce fica no componente (é comportamento de interface), o que o torna testável com fake timers sem envolver a página.

### D7. Tokens, base e responsividade
`tokens.css`: paleta neutra (`--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`), destaque (`--color-accent`, `--color-accent-text`, `--color-accent-hover`), semânticas (`--color-success/warning/danger` com par `-bg`/`-text`), espaçamento `--space-1..7` (4/8/12/16/24/32/48), tipografia (`--font-family`, `--font-size-sm/md/lg/xl`, `--font-weight-*`, `--line-height`), raios (`--radius-sm/md/lg`), sombras (`--shadow-sm/md`), `--tap-size: 44px`, `--focus-ring`. `base.css`: reset leve, `box-sizing`, fonte do sistema, `:focus-visible` com `--focus-ring`, classe utilitária `.visually-hidden`. Os breakpoints não podem ser variáveis CSS em `@media`; ficam como literais `640px` e `1024px` nos componentes, com um comentário apontando o guia. Cada componente traz seu CSS escopado (`<style>`), só com `var(--...)`.
**Tabela × cartões**: `ProductList` renderiza os dois blocos; o CSS esconde um deles com `display: none` (o que também o remove da árvore de acessibilidade): cartões `<640px`, tabela `>=640px`, e as colunas de marca e SKU `>=1024px`. **Alternativa descartada**: uma só `<table>` reformatada com CSS em cartões (perde a semântica de tabela em vários leitores de tela).
**Estoque**: limites (`0` esgotado, `1–10` baixo, `>10` em estoque) são uma escolha de apresentação deste projeto, sem base no contrato da API; ficam em uma constante do `StockBadge`.

### D8. Fronteira de importação por lint
Regra `no-restricted-imports` (padrão `**/lib/api/**`, com mensagem explicando a regra) para `apps/web/src/components/{atoms,molecules,organisms,templates}/**`. Verificada de fato criando uma violação temporária e vendo o lint falhar. As dependências "só para baixo" entre níveis ficam por convenção e revisão (uma regra por nível seria mais configuração do que valor neste tamanho).

### D9. Testes
- `http-client`: fake timers do Vitest, `fetch` falso e `random` injetado; cobre todos os cenários do spec, incluindo `Retry-After`, teto, timeout, abort (durante a requisição e durante a espera) e que `POST` não repete. Sem esperas reais.
- `products-api`: cliente HTTP falso; consulta montada e validação da resposta.
- Componentes (Testing Library + `@testing-library/jest-dom`, sem `user-event`, que não está instalado): `SearchBox` (debounce com fake timers), `Pagination` (limites e callbacks), `StockBadge` (faixas), `PriceTag`, `ProductList` (linhas, cartões, texto), `StatusMessage` (ação).
- `DashboardPage` com `api` falsa: primeira página, busca (uma requisição, página 1, sem `q` vazio), paginação (`offset`), vazio com "Clear search", erro com "Try again", respostas fora de ordem.
- `App`: `/` e caminho desconhecido, navegação e `popstate`.
- Contraste: um teste lê `tokens.css`, extrai os pares e calcula a razão de contraste WCAG.
- As asserções de CSS responsivo (`display: none` por media query) **não** são verificáveis em jsdom; ficam para a verificação em navegador real (D10).

### D10. Verificação em navegador real
Com a API real (banco temporário, seed) e o Vite em desenvolvimento (com o proxy), um spec do Cypress **temporário** (no scratchpad) abre `/` em 360, 768 e 1280 px, mede `document.documentElement.scrollWidth <= innerWidth`, confere qual apresentação está visível (tabela ou cartões) e tira screenshots que eu leio. Também tira um screenshot com foco de teclado, um da busca sem resultado e um de erro (API parada). Vale apenas para o Electron do Cypress; outros navegadores não são verificados.

## Risks / Trade-offs

- **Estética subjetiva** → é o foco da revisão do usuário; entrego screenshots e mantenho os tokens fáceis de ajustar.
- **Duplicação tabela/cartões** → dois blocos de marcação para o mesmo dado; aceitável pela acessibilidade e pela simplicidade do CSS.
- **Sem biblioteca de roteamento** → o roteador próprio cobre só o necessário; a T6 o estende.
- **Retry em `GET` sob rate limit** → o `429` é retentado com `Retry-After`; no pior caso o usuário espera até ~3 tentativas antes de ver o erro.
- **Verificação limitada a um navegador** → declarada no relatório.

## Migration Plan

Sem migração. Reversão: reverter o commit.

## Open Questions

Nenhuma.
