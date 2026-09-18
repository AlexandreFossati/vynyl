# Design

## Context

Estado após a T5: dashboard funcional, `lib/api` com `http-client` e `products-api` (só `list`), roteador próprio de uma rota (`router.path` + `navigate`), níveis Atomic Design com regra de lint que impede importar `lib/api` abaixo de `pages`, páginas que recebem a API por prop (`{ api = productsApi }`), tokens e testes com Vitest + Testing Library. Esta tarefa **replica** esses padrões; não define padrões novos, exceto onde a T5 não tinha o que reutilizar (formulário, diálogo, toasts). Motivação e escopo: `proposal.md`; requisitos: `specs/`; UI: seção 10 do guia.

Fatos verificados no código: o contrato de produto e as regras de campo estão em `@vynyl/shared` (`createProductInputSchema`, `productSchema`); `SKU_CONFLICT` chega **sem** `details` (o campo é deduzido do `code`); `400` traz `details: [{ path, message }]`; o cliente HTTP repete só `GET`, `HEAD`, `PUT` e `DELETE`; o jsdom 30 (usado nos testes) não implementa `<dialog>.showModal()`.

## Goals / Non-Goals

**Goals:** CRUD completo pela UI, validação com o schema compartilhado, erros por campo, diálogo e toasts acessíveis, mesmos padrões da T5.
**Non-Goals:** mudanças em `apps/api` ou `packages/shared`, e2e (T7), biblioteca de roteamento/formulários/UI, estado global, desfazer exclusão, aviso de alterações não salvas, foco gerenciado na troca de rota.

## Decisions

### D1. Rotas: função pura `resolveRoute` em `lib/routes.ts`
O `router.svelte.ts` continua só guardando o caminho e navegando. Um módulo puro `lib/routes.ts` exporta `resolveRoute(path)` → `{ name: 'dashboard' } | { name: 'product-create' } | { name: 'product-detail', id } | { name: 'product-edit', id } | { name: 'not-found' }` e os construtores de caminho (`paths.dashboard`, `paths.productCreate`, `paths.product(id)`, `paths.productEdit(id)`), para que nenhum componente escreva caminhos literais. `:id` aceita só `^[1-9]\d*$` (forma canônica; `007`, `0`, `1.5` e `abc` caem em não encontrado, sem chamar a API). `/products/new` é testado antes de `/products/:id`. Sem barra final: `/products/1/` é não encontrado (o Express faz o fallback na T7). O `App.svelte` escolhe a página com `$derived(resolveRoute(router.path))`. **Alternativa descartada**: biblioteca de roteamento (o guia prevê o roteador próprio e 4 rotas não justificam dependência).

### D2. Componente `Link` (átomo) para navegação interna
Hoje só a `NotFoundPage` navega, com um manipulador próprio. Agora há links em vários lugares (título na lista, "Add product", "Edit", "Back to products", marca do `Header`, "Cancel" não: é botão). Cria-se o átomo `Link` (`href`, variante `link` | `primary` | `secondary`, `children`, resto das props na `<a>`): âncora real, e um clique simples (botão 0, sem Ctrl/Cmd/Shift/Alt, sem `target`) chama `router.navigate`. As variantes `primary` e `secondary` reaproveitam a aparência do `Button` (duplicando ~10 linhas de CSS em vez de acoplar os dois átomos). A `NotFoundPage` passa a usar o `Link` (remove o manipulador duplicado; mesmo comportamento). O `Link` importa `router` de `lib/router.svelte` (não é `lib/api`, então a regra de lint permite; o estado de rota é global por natureza, como já aprovado na T5).

### D3. `products-api` estendido
`ProductsApi` ganha `get(id, signal?)`, `create(input, signal?)`, `update(id, input, signal?)` e `remove(id, signal?)`. As respostas com corpo passam por um único ajudante interno `parse(schema, body)` (o mesmo `ApiError` `INVALID_RESPONSE` da listagem, que passa a usá-lo), com `productSchema` para produto único; `remove` resolve `void` (o cliente já devolve `undefined` no `204`). `create` e `update` recebem `CreateProductInput` e `UpdateProductInput` de `@vynyl/shared`. O cliente HTTP **não muda**: `POST` e `PATCH` não são repetidos e `DELETE` é. Cada página declara só o que usa com `Pick<ProductsApi, ...>` (a `DashboardPage` passa a declarar `Pick<ProductsApi, 'list'>`, e os testes existentes continuam passando `{ list }`).

### D4. Carregar um produto: `lib/product-loader.svelte.ts`
Detalhe e edição precisam do mesmo carregamento, com a parte sutil do padrão da T5 (cancelar a requisição anterior e ignorar respostas antigas). Em vez de copiar essa lógica, `createProductLoader({ api, id })` (getters, para reagir a mudança de `id`) guarda um estado `loading | ready(product) | not-found | error` em `$state`, dispara `api.get` num `$effect` cujo *cleanup* aborta, ignora respostas de requisições abortadas, trata `ApiError` `PRODUCT_NOT_FOUND` como `not-found` e qualquer outra falha como `error`, e expõe `reload()` ("Try again", que volta ao estado de carregando). O HTML dos três estados (`StatusMessage`) fica em cada página (declarativo, poucas linhas). **Alternativa descartada**: copiar o `load()` do dashboard em cada página (3 cópias de lógica de cancelamento). A `DashboardPage` **não** é refatorada (fora do escopo).

### D5. Formulário
**Valores como texto.** Os campos são `type="text"` com `inputmode` (`decimal` para preço e peso, `numeric` para estoque), e não `type="number"`: o campo numérico do navegador descarta silenciosamente entradas inválidas, o que esconderia o erro que queremos mostrar. Os valores viram número só na validação.

**`lib/product-form.ts`** (puro, testável): `FormValues` (todos `string`), `emptyValues()`, `valuesFromProduct(product)`, `validateProductForm(values)` → `{ ok: true, input } | { ok: false, errors }` e `describeSaveFailure(error)` → `{ fields, toast? }`. A validação: (1) texto em branco (após `trim`) → "Required"; (2) preço, estoque e peso que não casam `^-?(\d+(\.\d*)?|\.\d+)$` → "Enter a number"; (3) o restante passa por `createProductInputSchema.safeParse` de `@vynyl/shared` (única fonte das regras; **não duplicamos limites nem `maxlength`**), usando só as mensagens dos campos que ainda não têm erro. **Mensagens** (conferidas com as reais do Zod, que soavam técnicas: "Too small: expected number to be >=0"): uma função `messageFor` reescreve os casos `too_small`/`too_big` ("Must be at least 0", "Must be greater than 0", "Must be at most 200 characters") com os limites lidos da própria issue (nunca escritos de novo) e o inteiro inválido vira "Enter a whole number"; as demais (as mensagens das regras do schema, como "Must be lowercase") só têm a primeira letra em maiúscula. `describeSaveFailure`: `SKU_CONFLICT` → `{ fields: { sku: 'This SKU is already in use' } }`; `VALIDATION_ERROR` com `details` → um erro por `path` que é campo conhecido, e `toast` se sobrar algum `path` desconhecido; qualquer outra falha → só o `toast` genérico (`SAVE_FAILED_MESSAGE`), nunca com texto do servidor.

**Enviar tudo no `PATCH`.** A edição envia todos os campos (não só os alterados): é a forma mais simples e correta com um formulário que carrega todos os valores, e evita o caso "nada mudou" (o schema exige ao menos um campo). Custo: `updatedAt` muda mesmo sem alterações reais e uma edição concorrente de outro campo é sobrescrita (aceitável neste escopo; o SKU igual ao próprio não conflita, conforme a API).

**Componentes.** `Textarea` (átomo, espelha o `Input`); `FormField` (molécula: `<label for>` + `Input` ou `Textarea` (`multiline`) + mensagem de erro com `id`, ligada por `aria-describedby`, `aria-invalid`); `ProductForm` (organismo, recebe `initialValues`, `submitLabel`, `busy`, `onsubmit(input)` e `oncancel`; sem chamadas de API). O formulário tem `novalidate` (a validação é nossa) e `required` nos campos (semântica para leitores de tela). Ao enviar com erro, o foco vai para o primeiro campo `aria-invalid` (na ordem do DOM). Erros do servidor entram por um método exportado do componente, `showErrors(errors)`, chamado pela página via `bind:this` (mais direto que sincronizar um *prop* com `$effect`); alterar um campo limpa o erro daquele campo. Layout: coluna única, `grid` de duas colunas a partir de 640 px, título e descrição na largura toda; ações ("Cancel" e o envio) em linha.

**Erros na página** (`ProductCreatePage`/`ProductEditPage`): `409` → `showErrors({ sku })`; `400` → `showErrors` com os campos mapeados e toast para o `unmapped`; `404` na edição → toast de erro e volta ao dashboard; qualquer outro → toast genérico ("Could not save the product. Please try again.") e o formulário mantém os valores. Um guarda `saving` impede o segundo envio (além do botão desabilitado).

### D6. `ConfirmDialog` com `<dialog>` nativo
O elemento `<dialog>` aberto com `showModal()` já entrega o que a exigência pede: camada superior, fundo inerte, foco preso, Esc (evento `cancel`) e devolução do foco ao elemento que abriu. É o "recurso da plataforma" que o `CLAUDE.md` manda preferir a código próprio. O organismo tem `open`, `title`, `message`, `confirmLabel`, `busy`, `onconfirm` e `oncancel`; um `$effect` chama `showModal()`/`close()` conforme `open`; o `title` nomeia o diálogo (`aria-labelledby`); depois de `showModal()` o foco vai explicitamente para "Cancel" (marcado com `data-initial-focus`; foco inicial na ação segura, verificável sem depender do `autofocus`). O evento `cancel` (Esc) é tratado com `preventDefault()` e chama `oncancel`, exceto com `busy` (o pai controla o fechamento por `open`). **Sincronização com o `close` nativo** (achado na verificação em navegador real): o navegador só deixa o `preventDefault()` valer quando o usuário interagiu com a página desde o último pedido de fechamento; sem isso, o Esc fecha o diálogo por conta própria e o `open` do pai ficava `true`, então "Delete" não reabria o diálogo. Por isso o evento `close` também é tratado: se `open` ainda é `true`, com `busy` o diálogo é reaberto (`showModal()`) e sem `busy` o pai é avisado por `oncancel`. Abaixo de 640 px o diálogo ocupa a tela toda; a partir daí, caixa centralizada com largura máxima (`height: fit-content`: com `auto` ele esticava de cima a baixo). **Alternativa descartada**: diálogo próprio com `role="dialog"`, armadilha de foco e Esc à mão (mais código e mais chance de falhar em acessibilidade). Como o jsdom não implementa `showModal`/`close`, `src/test/setup.ts` ganha um polyfill mínimo (marca/desmarca `open` e dispara `close`); o comportamento real (foco, Esc, tela cheia) é verificado em navegador (D10).

### D7. Toasts: `createToasts()` criado no `App`
`lib/toasts.svelte.ts` exporta `createToasts()` → `{ items, success(message), error(message), dismiss(id) }`, com `items` em `$state` e um `setTimeout` por toast (5 s sucesso, 8 s erro; constantes nomeadas), cancelado ao dispensar. O **`App.svelte` cria uma instância** e a entrega ao `Toaster` e às páginas pela prop `notify` (tipo `Notifier` = `{ success, error }`): sem singleton de módulo, e os testes de página passam um `notify` falso. O `Toaster` (organismo) fica sempre montado em uma região `aria-live="polite"`, fora das páginas, o que faz os toasts sobreviverem à navegação; cada `Toast` (molécula) mostra a mensagem e o botão "Dismiss notification", com `role="alert"` nos de erro. Posição fixa no rodapé (largura toda no mobile, canto no desktop).

### D8. Páginas e navegação
| Página | Dados | Ações |
|---|---|---|
| `ProductDetailPage` (`id`, `api`, `notify`) | `createProductLoader` | "Back to products", "Edit" (`Link`), "Delete" → `ConfirmDialog` → `remove` → toast + `/` |
| `ProductCreatePage` (`api`, `notify`) | — | `create` → toast "Product created" → `paths.product(id)` |
| `ProductEditPage` (`id`, `api`, `notify`) | `createProductLoader` | `update` → toast "Product updated" → `paths.product(id)` |

`ProductDetail` (organismo) só apresenta o produto (`<dl>`, `PriceTag`, `StockBadge`, datas em `<time datetime>`); os botões ficam na página. As páginas de detalhe e edição trocam de conteúdo quando `id` muda (o *loader* reage). `formatCategory` (hoje dentro do `ProductList`) e `formatDateTime` vão para `lib/format.ts` para serem usados também pelo detalhe (o `ProductList` só passa a importar a função). O peso é mostrado sem unidade (o contrato não define uma). Exclusão: o `DELETE` é idempotente para o cliente HTTP e pode ser repetido em falha de rede; se a primeira tentativa tiver removido o produto mas a resposta se perder, a repetição recebe `404` e a página mostra o toast de "não existe mais" e vai ao dashboard, resultado coerente.

### D9. Atomic Design: o que entra
| Nível | Novos |
|---|---|
| atoms | `Link`, `Textarea` |
| molecules | `FormField`, `Toast` |
| organisms | `ProductForm`, `ProductDetail`, `ConfirmDialog`, `Toaster` |
| pages | `ProductDetailPage`, `ProductCreatePage`, `ProductEditPage` |
| lib | `routes.ts`, `format.ts`, `product-form.ts`, `product-loader.svelte.ts`, `toasts.svelte.ts` |

Alterados: `Header` (marca vira `Link` para `/`), `ProductList` (título é `Link`), `DashboardPage` ("Add product" no toolbar, tipo `Pick`), `NotFoundPage` (usa `Link`), `App.svelte` (rotas, `Toaster`), `Input` (borda de perigo com `aria-invalid`) e `styles/base.css` (`textarea` herda a fonte, como `input` e `button`; sem isso a descrição saía em monoespaçada). **Um token novo**: `--color-overlay` (o fundo escurecido atrás do diálogo), para não haver cor literal no componente. Na marca do `Header`, o `Link` é neutralizado com `:global(a)` (cor herdada, sem sublinhado), para ler como o nome do app e não como chamada para ação.

### D10. Testes e verificação
- Unitários: `routes` (todas as rotas, ids inválidos), `format`, `product-form` (em branco, não numérico, cada regra do schema, valores aparados, mapeamento de erros da API), `toasts` (fake timers: fechamento automático, manual, independência entre toasts), `products-api` (novos métodos, `INVALID_RESPONSE`, falhas repassadas).
- Componentes (Testing Library, `fireEvent`, consultas por papel): `Link` (clique simples × com modificador), `FormField`, `Toast`/`Toaster`, `ProductForm` (envio válido, erros por campo, foco, `busy`, `showErrors`, limpar erro ao editar), `ConfirmDialog` (abre/fecha, `cancel` chama `oncancel`, `busy` ignora Esc, foco inicial), `ProductDetail`.
- Páginas com API falsa e promessas controladas (`deferred`): fluxos feliz, 400/409/404/rede, envio único, cancelar, exclusão (confirmar, cancelar, 404, falha), carregamento/erro/404 e resposta antiga na troca de `id`. `App`: cada rota e a navegação.
- **Navegador real (Electron do Cypress, spec temporário no scratchpad, API real com banco temporário)**: CRUD completo pela UI, SKU duplicado, Esc e foco do diálogo, `aria-live` dos toasts, e layout em 360, 768 e 1280 px (sem rolagem horizontal, uma × duas colunas, diálogo em tela cheia no mobile) com screenshots lidos. Só o Electron é verificado.

## Risks / Trade-offs

- **Mensagens do Zod** (ex.: inteiro inválido) podem soar técnicas → conferidas ao implementar; se alguma for ruim, mapear só essa em `product-form.ts` e registrar.
- **`PATCH` com todos os campos** → última escrita vence em edições concorrentes; documentado (D5).
- **`showErrors` imperativo** → foge do "props para baixo", mas evita sincronização frágil por `$effect`; contido em um só método.
- **Polyfill de `<dialog>` nos testes** → o teste cobre a nossa lógica, não o navegador; o navegador é verificado à parte.
- **Sem foco na troca de rota** → leitores de tela não são avisados da nova tela; limitação registrada (fora do escopo).
- **Estética** subjetiva → foco da revisão, como na T5.

## Migration Plan

Sem migração. Reversão: reverter o commit.

## Open Questions

Nenhuma.
