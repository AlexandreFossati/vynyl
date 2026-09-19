# Proposal

## Why

The SPA only lists products (T5). The statement requires the interface to exercise the whole API: view detail, create, edit and delete. T6 replicates in the SPA the patterns approved in T5 (Atomic Design levels, pages that receive the API via a prop, loading/empty/error states, tokens, test style) to complete the CRUD through the UI.

## What Changes

- **Routes** `/products/new`, `/products/:id` and `/products/:id/edit`, besides `/`; an invalid identifier falls on the not-found page. T5's in-house router is extended, with no new dependency.
- **Product detail**: all the product's fields, "Edit" and "Delete" actions, loading, error (with "Try again") and nonexistent product (404) states.
- **Create and edit** with a shared `ProductForm`: client-side validation by the **same Zod schema from `@vynyl/shared`**, per-field error, duplicate SKU (409) shown on the SKU field, server validation errors (400) shown on the fields, button disabled while submitting, two columns on desktop and one on mobile.
- **Deletion** with `ConfirmDialog` (native `<dialog>` element: trapped and returned focus, Esc key, full screen on mobile).
- **Success and error toasts** (`aria-live` region, automatic and manual closing) and coherent navigation after each action.
- **`products-api`** gains `get`, `create`, `update` and `remove`, validating the responses with the shared schema; the HTTP client still does not retry `POST` (nor `PATCH`).
- **Navigation**: `Link` component (navigates without reloading), product title as a link in the list, "Add product" button on the dashboard and the `Header` brand as a link to `/`.

**Out of scope**: any new UI feature (sorting, filters, categories, bulk deletion, undo), Cypress and serving the SPA through Express (T7), changes to the API or `packages/shared`.

## Capabilities

### New Capabilities

- `product-detail`: detail screen, its states and navigation from the list.
- `product-editing`: creation and editing with the shared form, validation and per-field errors.
- `product-deletion`: deletion with a confirmation dialog.
- `web-notifications`: accessible success and error toasts.

### Modified Capabilities

- `web-app-structure`: routing now has the product routes (parameterized).
- `web-http-client`: the products API now offers get, create, update and remove.
- `product-dashboard`: each product in the list leads to the detail page and the dashboard offers "Add product".

## Impact

- **Code**: `apps/web/src` (new pages, organisms, molecules and atoms; `lib/routes.ts`, `lib/toasts.svelte.ts`, `lib/product-form.ts`, `lib/product-loader.svelte.ts`; `products-api`; `App.svelte`, `Header`, `ProductList`, `DashboardPage`, `NotFoundPage`). No change to `apps/api` or `packages/shared`. **No new dependencies.**
- **Observable behavior**: the full CRUD works through the UI in `npm run dev`.
- **Risks**: `<dialog>` is not implemented by jsdom (the test uses a minimal polyfill; real focus and Esc are verified in a real browser); validation messages come from Zod and may sound technical in some fields; aesthetics are subjective and are the focus of the review.
