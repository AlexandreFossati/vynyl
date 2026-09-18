# Proposal

## Why

A SPA só lista produtos (T5). O enunciado exige que a interface exercite a API inteira: ver o detalhe, criar, editar e excluir. A T6 replica na SPA os padrões aprovados na T5 (níveis Atomic Design, páginas que recebem a API por prop, estados de carregando/vazio/erro, tokens, estilo de testes) para completar o CRUD pela UI.

## What Changes

- **Rotas** `/products/new`, `/products/:id` e `/products/:id/edit`, além de `/`; identificador inválido cai na página de não encontrado. O roteador próprio da T5 é estendido, sem dependência nova.
- **Detalhe do produto**: todos os campos do produto, ações "Edit" e "Delete", estados de carregando, erro (com "Try again") e produto inexistente (404).
- **Criar e editar** com um `ProductForm` compartilhado: validação no cliente pelo **mesmo schema Zod de `@vynyl/shared`**, erro por campo, SKU duplicado (409) mostrado no campo do SKU, erros de validação do servidor (400) mostrados nos campos, botão desabilitado durante o envio, duas colunas no desktop e uma no mobile.
- **Exclusão** com `ConfirmDialog` (elemento `<dialog>` nativo: foco preso e devolvido, tecla Esc, tela cheia no mobile).
- **Toasts** de sucesso e erro (região `aria-live`, fechamento automático e manual) e navegação coerente depois de cada ação.
- **`products-api`** ganha `get`, `create`, `update` e `remove`, validando as respostas com o schema compartilhado; o cliente HTTP continua sem repetir `POST` (nem `PATCH`).
- **Navegação**: componente `Link` (navega sem recarregar), título do produto como link na lista, botão "Add product" no dashboard e marca do `Header` como link para `/`.

**Fora de escopo**: qualquer feature nova de UI (ordenação, filtros, categorias, exclusão em massa, desfazer), Cypress e servir a SPA pelo Express (T7), alterações na API ou em `packages/shared`.

## Capabilities

### New Capabilities

- `product-detail`: tela de detalhe, seus estados e a navegação a partir da lista.
- `product-editing`: criação e edição com o formulário compartilhado, validação e erros por campo.
- `product-deletion`: exclusão com diálogo de confirmação.
- `web-notifications`: toasts de sucesso e erro, acessíveis.

### Modified Capabilities

- `web-app-structure`: o roteamento passa a ter as rotas de produto (parametrizadas).
- `web-http-client`: a API de produtos passa a oferecer obter, criar, atualizar e remover.
- `product-dashboard`: cada produto da lista leva ao detalhe e o dashboard oferece "Add product".

## Impact

- **Código**: `apps/web/src` (novas páginas, organismos, moléculas e átomos; `lib/routes.ts`, `lib/toasts.svelte.ts`, `lib/product-form.ts`, `lib/product-loader.svelte.ts`; `products-api`; `App.svelte`, `Header`, `ProductList`, `DashboardPage`, `NotFoundPage`). Nenhuma alteração em `apps/api` nem em `packages/shared`. **Sem novas dependências.**
- **Comportamento observável**: o CRUD completo funciona pela UI em `npm run dev`.
- **Riscos**: `<dialog>` não é implementado pelo jsdom (o teste usa um polyfill mínimo; foco e Esc reais são verificados em navegador real); mensagens de validação vêm do Zod e podem soar técnicas em alguns campos; a estética é subjetiva e é o foco da revisão.
