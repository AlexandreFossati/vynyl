# Design

## Context

State after T4: API complete and operable; `apps/web` has only the skeleton (Vite + Svelte 5, `App.svelte` with an `<h1>`, empty Atomic Design folders, Vitest with jsdom and Testing Library configured). This is the **frontend model task**: the patterns here will be reviewed and replicated in T6. Motivation and scope: `proposal.md`; requirements: `specs/`; UI rules: section 10 of the guide; REST client: section 11.1.

Verified facts: the dataset has 44 products, lowercase categories with a hyphen (`dimensional-travel`), prices from 0.99 to 1299 and stock from 0 to 250; the API listing accepts `limit` up to 100, `offset` and `q` up to 100 characters; Svelte 5 is already installed with `eslint-plugin-svelte` in the lint configuration (so an import rule applies to `.svelte`).

## Goals / Non-Goals

**Goals:** visual foundation with tokens, resilient and tested REST client, responsive dashboard with search, pagination and states, clear patterns for T6.
**Non-Goals:** detail/create/edit/delete, toasts, dialogs, dark mode, animations, global state, UI library, fetching library.

## Decisions

### D1. Minimal in-house routing (fallback foreseen in the guide)
`lib/router.svelte.ts` keeps the current path in a `$state`, exposes `navigate(path)` (`history.pushState`) and listens to `popstate`. `App.svelte` chooses the page by the path. I did not adopt a library: in T5 there is **one** route, a new dependency would cost more (maintenance, Svelte 5 compatibility) than the ~20 lines of our own, and the guide foresees the fallback. **I did not evaluate libraries individually**; the decision is by cost/benefit. T6 extends the same module with parameterized routes (`/products/:id`). The server fallback to `index.html` is left for T7 (Vite already does it in development).

### D2. Levels, components and what each one knows
Only what the dashboard uses gets in (guide 10.1); each component in one file, `PascalCase`, typed props (`$props()`), events as *callback props* (`onclick`, `onsearch`, `onpagechange`), no `createEventDispatcher`.

| Level | Components | Note |
|---|---|---|
| atoms | `Button` (variants `primary`/`secondary`), `Input`, `Badge` (tones), `Spinner` | No business state |
| molecules | `SearchBox`, `Pagination`, `PriceTag`, `StockBadge`, `StatusMessage` | `SearchBox` contains the debounce; `StatusMessage` serves loading, empty and error |
| organisms | `Header`, `ProductList` | `ProductList` renders table and cards from `products` |
| templates | `AppShell` | Header + content via *snippets*; only positioning |
| pages | `DashboardPage`, `NotFoundPage` | The only ones that import `lib/api` |

`Header` shows only the app title (no navigation: there is only one screen). `Icon` and `Select` do not come in (they are not used).

### D3. REST client (`lib/api/http-client.ts`)
`createHttpClient({ baseUrl = '', timeoutMs = 10_000, retries = 3, baseDelayMs = 300, factor = 2, maxDelayMs = 5_000, fetch = globalThis.fetch, random = Math.random })` returns `{ request }`. Algorithm per request:
1. If the caller's signal is already aborted, reject with `AbortError`.
2. For each attempt `n = 0..retries`: create its own `AbortController` linked to the caller's signal and to a `timeoutMs` timer; call `fetch`. Any `fetch` rejection becomes `NETWORK_ERROR` (or `TIMEOUT` if it was the timer), except if the caller aborted (then `AbortError` and end).
3. `2xx` → `204` returns `undefined`, otherwise `response.json()` (parse failure → `INVALID_RESPONSE`, no retry). Non-`2xx` → `ApiError` (envelope validated with `apiErrorSchema` from `shared`; no envelope → `UNKNOWN`).
4. If the method is idempotent, the error is retryable (`NETWORK_ERROR`, `TIMEOUT` or status 408/429/502/503/504) and there are attempts left: wait and retry. Wait = `Retry-After` (seconds or HTTP date) limited to `maxDelayMs`, or, without it, `random() × min(maxDelayMs, baseDelayMs × factor^n)` (full jitter).
5. The wait is a `setTimeout` that also listens to the caller's signal (immediate cancellation).

`ApiError` (`lib/api/api-error.ts`): `status` (0 with no response), `code` (`ErrorCode` from `shared` or `NETWORK_ERROR | TIMEOUT | INVALID_RESPONSE | UNKNOWN`), `message`, `details?`. **Alternative discarded**: injecting `sleep` (Vitest's fake timers are enough and the production code stays without a parameter just for testing).

### D4. `products-api` (`lib/api/products-api.ts`)
`createProductsApi(http)` → `{ list({ limit, offset, q }, signal) }`; validates the response with `productListResponseSchema` (`safeParse`; failure → `ApiError` `INVALID_RESPONSE`). The module also exports the `productsApi` instance (client with an empty `baseUrl`, relative `/api/...` paths). The `ProductsApi` type is what the pages receive via a prop (default: the real instance), which allows testing the pages with a fake API without mocking modules.

### D5. Data access and states in the page
`DashboardPage` (`api` via prop, default `productsApi`) keeps `query`, `page`, `result`, `error` and `loading` in runes. An `$effect` depending on `query` and `page` triggers the request with a new `AbortController` and returns, in the *cleanup*, `abort()`: that way the previous request is cancelled and no old response is applied. `AbortError` is ignored; any other error becomes the error state. States: no `result` and loading → `StatusMessage` with `busy`; error → danger `StatusMessage` with "Try again" (which increments a counter the effect reads, repeating the same query); `result.total === 0` → empty (with "Clear search" if there is `query`); otherwise `ProductList` + `Pagination`. Reloads after the first keep the previous list with `aria-busy` and reduced opacity (no flicker). Changing the search resets `page` to 1 in the same tick (a single request).

### D6. Debounce in `SearchBox`
The `Input` atom is controlled (`value` with `bind`); `SearchBox` keeps the typed text and, on each change, restarts a 300 ms `setTimeout` that calls `onsearch(text)`; the *cleanup* clears the timer. The text is limited by `maxlength=100`; the page does `trim` and treats empty as no `q`. The debounce lives in the component (it is interface behavior), which makes it testable with fake timers without involving the page.

### D7. Tokens, base and responsiveness
`tokens.css`: neutral palette (`--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`), accent (`--color-accent`, `--color-accent-text`, `--color-accent-hover`), semantic (`--color-success/warning/danger` with a `-bg`/`-text` pair), spacing `--space-1..7` (4/8/12/16/24/32/48), typography (`--font-family`, `--font-size-sm/md/lg/xl`, `--font-weight-*`, `--line-height`), radii (`--radius-sm/md/lg`), shadows (`--shadow-sm/md`), `--tap-size: 44px`, `--focus-ring`. `base.css`: light reset, `box-sizing`, system font, `:focus-visible` with `--focus-ring`, `.visually-hidden` utility class. Breakpoints cannot be CSS variables in `@media`; they stay as literals `640px` and `1024px` in the components, with a comment pointing to the guide. Each component carries its scoped CSS (`<style>`), with `var(--...)` only.
**Table × cards**: `ProductList` renders both blocks; the CSS hides one of them with `display: none` (which also removes it from the accessibility tree): cards `<640px`, table `>=640px`, and the brand and SKU columns `>=1024px`. **Alternative discarded**: a single `<table>` reformatted with CSS into cards (loses the table semantics in several screen readers).
**Stock**: limits (`0` out of stock, `1–10` low, `>10` in stock) are a presentation choice of this project, with no basis in the API contract; they stay in a constant in `StockBadge`.

### D8. Import boundary via lint
`no-restricted-imports` rule (pattern `**/lib/api/**`, with a message explaining the rule) for `apps/web/src/components/{atoms,molecules,organisms,templates}/**`. Actually verified by creating a temporary violation and seeing lint fail. The "only downward" dependencies between levels stay by convention and review (a rule per level would be more configuration than value at this size).

### D9. Tests
- `http-client`: Vitest fake timers, fake `fetch` and injected `random`; covers all the spec's scenarios, including `Retry-After`, cap, timeout, abort (during the request and during the wait) and that `POST` does not retry. No real waits.
- `products-api`: fake HTTP client; query built and response validation.
- Components (Testing Library + `@testing-library/jest-dom`, no `user-event`, which is not installed): `SearchBox` (debounce with fake timers), `Pagination` (limits and callbacks), `StockBadge` (bands), `PriceTag`, `ProductList` (rows, cards, text), `StatusMessage` (action).
- `DashboardPage` with a fake `api`: first page, search (one request, page 1, no empty `q`), pagination (`offset`), empty with "Clear search", error with "Try again", out-of-order responses.
- `App`: `/` and unknown path, navigation and `popstate`.
- Contrast: a test reads `tokens.css`, extracts the pairs and computes the WCAG contrast ratio.
- Responsive CSS assertions (`display: none` by media query) are **not** verifiable in jsdom; they are left for the real-browser verification (D10).

### D10. Verification in a real browser
With the real API (temporary database, seed) and Vite in development (with the proxy), a **temporary** Cypress spec (in the scratchpad) opens `/` at 360, 768 and 1280 px, measures `document.documentElement.scrollWidth <= innerWidth`, checks which presentation is visible (table or cards) and takes screenshots that I read. It also takes a screenshot with keyboard focus, one of the search with no results and one of an error (API stopped). It only applies to Cypress's Electron; other browsers are not verified.

## Risks / Trade-offs

- **Subjective aesthetics** → it is the focus of the user's review; I deliver screenshots and keep the tokens easy to adjust.
- **Table/cards duplication** → two blocks of markup for the same data; acceptable for accessibility and CSS simplicity.
- **No routing library** → the in-house router covers only what is needed; T6 extends it.
- **Retry on `GET` under rate limit** → `429` is retried with `Retry-After`; in the worst case the user waits up to ~3 attempts before seeing the error.
- **Verification limited to one browser** → declared in the report.

## Migration Plan

No migration. Rollback: revert the commit.

## Open Questions

None.
