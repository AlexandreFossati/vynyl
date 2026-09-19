# Design

## Context

State after T5: working dashboard, `lib/api` with `http-client` and `products-api` (only `list`), in-house router with one route (`router.path` + `navigate`), Atomic Design levels with a lint rule that prevents importing `lib/api` below `pages`, pages that receive the API via a prop (`{ api = productsApi }`), tokens and tests with Vitest + Testing Library. This task **replicates** those patterns; it does not define new patterns, except where T5 had nothing to reuse (form, dialog, toasts). Motivation and scope: `proposal.md`; requirements: `specs/`; UI: section 10 of the guide.

Facts verified in the code: the product contract and the field rules are in `@vynyl/shared` (`createProductInputSchema`, `productSchema`); `SKU_CONFLICT` arrives **without** `details` (the field is deduced from the `code`); `400` carries `details: [{ path, message }]`; the HTTP client retries only `GET`, `HEAD`, `PUT` and `DELETE`; jsdom 30 (used in the tests) does not implement `<dialog>.showModal()`.

## Goals / Non-Goals

**Goals:** full CRUD through the UI, validation with the shared schema, per-field errors, accessible dialog and toasts, same patterns as T5.
**Non-Goals:** changes in `apps/api` or `packages/shared`, e2e (T7), routing/forms/UI library, global state, undo deletion, unsaved-changes warning, managed focus on route change.

## Decisions

### D1. Routes: pure function `resolveRoute` in `lib/routes.ts`
`router.svelte.ts` keeps only holding the path and navigating. A pure module `lib/routes.ts` exports `resolveRoute(path)` → `{ name: 'dashboard' } | { name: 'product-create' } | { name: 'product-detail', id } | { name: 'product-edit', id } | { name: 'not-found' }` and the path builders (`paths.dashboard`, `paths.productCreate`, `paths.product(id)`, `paths.productEdit(id)`), so that no component writes literal paths. `:id` accepts only `^[1-9]\d*$` (canonical form; `007`, `0`, `1.5` and `abc` fall on not found, without calling the API). `/products/new` is tested before `/products/:id`. No trailing slash: `/products/1/` is not found (Express does the fallback in T7). `App.svelte` chooses the page with `$derived(resolveRoute(router.path))`. **Alternative discarded**: routing library (the guide foresees the in-house router and 4 routes do not justify a dependency).

### D2. `Link` component (atom) for internal navigation
Today only `NotFoundPage` navigates, with its own handler. Now there are links in several places (title in the list, "Add product", "Edit", "Back to products", `Header` brand, not "Cancel": it is a button). The `Link` atom is created (`href`, variant `link` | `primary` | `secondary`, `children`, remaining props on the `<a>`): a real anchor, and a plain click (button 0, no Ctrl/Cmd/Shift/Alt, no `target`) calls `router.navigate`. The `primary` and `secondary` variants reuse `Button`'s appearance (duplicating ~10 lines of CSS instead of coupling the two atoms). `NotFoundPage` starts using `Link` (removes the duplicated handler; same behavior). `Link` imports `router` from `lib/router.svelte` (it is not `lib/api`, so the lint rule allows it; route state is global by nature, as already approved in T5).

### D3. Extended `products-api`
`ProductsApi` gains `get(id, signal?)`, `create(input, signal?)`, `update(id, input, signal?)` and `remove(id, signal?)`. Responses with a body go through a single internal helper `parse(schema, body)` (the same `INVALID_RESPONSE` `ApiError` as the listing, which starts using it), with `productSchema` for a single product; `remove` resolves `void` (the client already returns `undefined` on `204`). `create` and `update` receive `CreateProductInput` and `UpdateProductInput` from `@vynyl/shared`. The HTTP client **does not change**: `POST` and `PATCH` are not retried and `DELETE` is. Each page declares only what it uses with `Pick<ProductsApi, ...>` (`DashboardPage` starts declaring `Pick<ProductsApi, 'list'>`, and the existing tests keep passing `{ list }`).

### D4. Loading a product: `lib/product-loader.svelte.ts`
Detail and edit need the same loading, with the subtle part of T5's pattern (cancel the previous request and ignore old responses). Instead of copying that logic, `createProductLoader({ api, id })` (getters, to react to `id` changes) keeps a `loading | ready(product) | not-found | error` state in `$state`, triggers `api.get` in an `$effect` whose *cleanup* aborts, ignores responses of aborted requests, treats `ApiError` `PRODUCT_NOT_FOUND` as `not-found` and any other failure as `error`, and exposes `reload()` ("Try again", which goes back to the loading state). The HTML of the three states (`StatusMessage`) stays in each page (declarative, a few lines). **Alternative discarded**: copying the dashboard's `load()` into each page (3 copies of cancellation logic). `DashboardPage` is **not** refactored (out of scope).

### D5. Form
**Values as text.** The fields are `type="text"` with `inputmode` (`decimal` for price and weight, `numeric` for stock), and not `type="number"`: the browser's numeric field silently discards invalid input, which would hide the error we want to show. The values become numbers only at validation.

**`lib/product-form.ts`** (pure, testable): `FormValues` (all `string`), `emptyValues()`, `valuesFromProduct(product)`, `validateProductForm(values)` → `{ ok: true, input } | { ok: false, errors }` and `describeSaveFailure(error)` → `{ fields, toast? }`. The validation: (1) blank text (after `trim`) → "Required"; (2) price, stock and weight that do not match `^-?(\d+(\.\d*)?|\.\d+)$` → "Enter a number"; (3) the rest goes through `createProductInputSchema.safeParse` from `@vynyl/shared` (the single source of the rules; **we do not duplicate limits or `maxlength`**), using only the messages of fields that do not yet have an error. **Messages** (checked against Zod's real ones, which sounded technical: "Too small: expected number to be >=0"): a `messageFor` function rewrites the `too_small`/`too_big` cases ("Must be at least 0", "Must be greater than 0", "Must be at most 200 characters") with the limits read from the issue itself (never written again) and the invalid integer becomes "Enter a whole number"; the others (the schema rules' messages, such as "Must be lowercase") only get the first letter capitalized. `describeSaveFailure`: `SKU_CONFLICT` → `{ fields: { sku: 'This SKU is already in use' } }`; `VALIDATION_ERROR` with `details` → one error per `path` that is a known field, and `toast` if any unknown `path` is left over; any other failure → only the generic `toast` (`SAVE_FAILED_MESSAGE`), never with the server's text.

**Send everything in the `PATCH`.** The edit sends all the fields (not just the changed ones): it is the simplest and correct way with a form that carries all the values, and avoids the "nothing changed" case (the schema requires at least one field). Cost: `updatedAt` changes even with no real changes and a concurrent edit of another field is overwritten (acceptable in this scope; a SKU equal to its own does not conflict, per the API).

**Components.** `Textarea` (atom, mirrors `Input`); `FormField` (molecule: `<label for>` + `Input` or `Textarea` (`multiline`) + error message with `id`, linked by `aria-describedby`, `aria-invalid`); `ProductForm` (organism, receives `initialValues`, `submitLabel`, `busy`, `onsubmit(input)` and `oncancel`; no API calls). The form has `novalidate` (the validation is ours) and `required` on the fields (semantics for screen readers). When submitting with an error, focus goes to the first `aria-invalid` field (in DOM order). Server errors come in through an exported component method, `showErrors(errors)`, called by the page via `bind:this` (more direct than synchronizing a *prop* with `$effect`); changing a field clears that field's error. Layout: single column, two-column `grid` from 640 px, title and description at full width; actions ("Cancel" and the submit) in a row.

**Errors in the page** (`ProductCreatePage`/`ProductEditPage`): `409` → `showErrors({ sku })`; `400` → `showErrors` with the mapped fields and a toast for the `unmapped`; `404` on edit → error toast and back to the dashboard; any other → generic toast ("Could not save the product. Please try again.") and the form keeps the values. A `saving` guard prevents the second submission (besides the disabled button).

### D6. `ConfirmDialog` with a native `<dialog>`
The `<dialog>` element opened with `showModal()` already delivers what the requirement asks: top layer, inert background, trapped focus, Esc (the `cancel` event) and returning focus to the element that opened it. It is the "platform feature" that `CLAUDE.md` says to prefer over own code. The organism has `open`, `title`, `message`, `confirmLabel`, `busy`, `onconfirm` and `oncancel`; an `$effect` calls `showModal()`/`close()` according to `open`; the `title` names the dialog (`aria-labelledby`); after `showModal()` focus goes explicitly to "Cancel" (marked with `data-initial-focus`; initial focus on the safe action, verifiable without depending on `autofocus`). The `cancel` event (Esc) is handled with `preventDefault()` and calls `oncancel`, except with `busy` (the parent controls closing through `open`). **Synchronization with the native `close`** (finding in the real-browser verification): the browser only lets `preventDefault()` take effect when the user has interacted with the page since the last close request; without that, Esc closes the dialog by itself and the parent's `open` stayed `true`, so "Delete" did not reopen the dialog. That is why the `close` event is also handled: if `open` is still `true`, with `busy` the dialog is reopened (`showModal()`) and without `busy` the parent is notified by `oncancel`. Below 640 px the dialog takes up the whole screen; from there, a centered box with a maximum width (`height: fit-content`: with `auto` it stretched top to bottom). **Alternative discarded**: own dialog with `role="dialog"`, focus trap and Esc by hand (more code and more chance of failing on accessibility). Since jsdom does not implement `showModal`/`close`, `src/test/setup.ts` gains a minimal polyfill (sets/unsets `open` and fires `close`); the real behavior (focus, Esc, full screen) is verified in a browser (D10).

### D7. Toasts: `createToasts()` created in `App`
`lib/toasts.svelte.ts` exports `createToasts()` → `{ items, success(message), error(message), dismiss(id) }`, with `items` in `$state` and a `setTimeout` per toast (5 s success, 8 s error; named constants), cancelled on dismiss. **`App.svelte` creates one instance** and hands it to `Toaster` and to the pages through the `notify` prop (type `Notifier` = `{ success, error }`): no module singleton, and the page tests pass a fake `notify`. `Toaster` (organism) stays always mounted in an `aria-live="polite"` region, outside the pages, which makes the toasts survive navigation; each `Toast` (molecule) shows the message and the "Dismiss notification" button, with `role="alert"` on error ones. Fixed position at the bottom (full width on mobile, corner on desktop).

### D8. Pages and navigation
| Page | Data | Actions |
|---|---|---|
| `ProductDetailPage` (`id`, `api`, `notify`) | `createProductLoader` | "Back to products", "Edit" (`Link`), "Delete" → `ConfirmDialog` → `remove` → toast + `/` |
| `ProductCreatePage` (`api`, `notify`) | — | `create` → toast "Product created" → `paths.product(id)` |
| `ProductEditPage` (`id`, `api`, `notify`) | `createProductLoader` | `update` → toast "Product updated" → `paths.product(id)` |

`ProductDetail` (organism) only presents the product (`<dl>`, `PriceTag`, `StockBadge`, dates in `<time datetime>`); the buttons stay in the page. The detail and edit pages change content when `id` changes (the *loader* reacts). `formatCategory` (today inside `ProductList`) and `formatDateTime` move to `lib/format.ts` to be used by the detail page too (`ProductList` only starts importing the function). The weight is shown without a unit (the contract does not define one). Deletion: `DELETE` is idempotent for the HTTP client and may be retried on a network failure; if the first attempt removed the product but the response is lost, the retry receives `404` and the page shows the "no longer exists" toast and goes to the dashboard, a coherent outcome.

### D9. Atomic Design: what comes in
| Level | New |
|---|---|
| atoms | `Link`, `Textarea` |
| molecules | `FormField`, `Toast` |
| organisms | `ProductForm`, `ProductDetail`, `ConfirmDialog`, `Toaster` |
| pages | `ProductDetailPage`, `ProductCreatePage`, `ProductEditPage` |
| lib | `routes.ts`, `format.ts`, `product-form.ts`, `product-loader.svelte.ts`, `toasts.svelte.ts` |

Changed: `Header` (brand becomes a `Link` to `/`), `ProductList` (title is a `Link`), `DashboardPage` ("Add product" in the toolbar, `Pick` type), `NotFoundPage` (uses `Link`), `App.svelte` (routes, `Toaster`), `Input` (danger border with `aria-invalid`) and `styles/base.css` (`textarea` inherits the font, like `input` and `button`; without that the description came out in monospace). **One new token**: `--color-overlay` (the darkened background behind the dialog), so there is no literal color in the component. On the `Header` brand, the `Link` is neutralized with `:global(a)` (inherited color, no underline), to read as the app's name and not as a call to action.

### D10. Tests and verification
- Unit: `routes` (all routes, invalid ids), `format`, `product-form` (blank, non-numeric, each schema rule, trimmed values, API error mapping), `toasts` (fake timers: automatic closing, manual, independence between toasts), `products-api` (new methods, `INVALID_RESPONSE`, failures forwarded).
- Components (Testing Library, `fireEvent`, queries by role): `Link` (plain click × with a modifier), `FormField`, `Toast`/`Toaster`, `ProductForm` (valid submit, per-field errors, focus, `busy`, `showErrors`, clearing the error on edit), `ConfirmDialog` (opens/closes, `cancel` calls `oncancel`, `busy` ignores Esc, initial focus), `ProductDetail`.
- Pages with a fake API and controlled promises (`deferred`): happy paths, 400/409/404/network, single submission, cancel, deletion (confirm, cancel, 404, failure), loading/error/404 and an old response on `id` change. `App`: each route and navigation.
- **Real browser (Cypress's Electron, temporary spec in the scratchpad, real API with a temporary database)**: full CRUD through the UI, duplicate SKU, Esc and dialog focus, toasts' `aria-live`, and layout at 360, 768 and 1280 px (no horizontal scroll, one × two columns, full-screen dialog on mobile) with screenshots read. Only Electron is verified.

## Risks / Trade-offs

- **Zod messages** (e.g. invalid integer) may sound technical → checked while implementing; if any is bad, map only that one in `product-form.ts` and record it.
- **`PATCH` with all fields** → last write wins on concurrent edits; documented (D5).
- **Imperative `showErrors`** → departs from "props down", but avoids fragile synchronization via `$effect`; contained in a single method.
- **`<dialog>` polyfill in the tests** → the test covers our logic, not the browser; the browser is verified separately.
- **No focus on route change** → screen readers are not told about the new screen; limitation recorded (out of scope).
- **Subjective aesthetics** → focus of the review, as in T5.

## Migration Plan

No migration. Rollback: revert the commit.

## Open Questions

None.
