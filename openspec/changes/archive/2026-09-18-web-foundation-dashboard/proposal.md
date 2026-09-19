# Proposal

## Why

The API is complete and operable (T1–T4), but the SPA is still an `<h1>`. T5 is the **frontend model task**: it delivers the visual foundation, the resilient REST client (the frontend half of the resilience **extra feature**) and the first real screen, the product dashboard. The patterns defined here (component levels, data access in pages, states, tokens, test style) will be approved by the user and replicated in T6, so the goal is to get the pattern right, not to cover screens.

## What Changes

- **Visual foundation**: `styles/tokens.css` (single source of colors, spacing, typography, radii and shadows) and `styles/base.css` (light reset, system font, visible focus, 44 px touch targets). Mobile-first, breakpoints 640 and 1024 px. Plain CSS, no UI library.
- **REST client** (`lib/api/http-client.ts`): per-attempt timeout, cancellation, retry only on idempotent methods and only on network error/timeout/408/429/502/503/504, exponential backoff with full jitter, respect for `Retry-After`, typed `ApiError`. `products-api` with the listing, validating the response with the shared schema.
- **Atomic Design components**, only the ones the dashboard uses: atoms (Button, Input, Badge, Spinner), molecules (SearchBox, Pagination, PriceTag, StockBadge, StatusMessage), organisms (Header, ProductList with a table on desktop and cards on mobile), template (AppShell) and page (DashboardPage, NotFoundPage).
- **Dashboard** (`/`): lists the real products from the API, debounced search, pagination of 30 per page, loading, empty and error states (with "Try again"), no horizontal scroll at 360, 768 and 1280 px.
- **Minimal in-house routing** over the History API (route `/` and a not-found page) and **Vite proxy** for `/api` in development.
- **Lint rule** that prevents components below `pages` from importing from `lib/api` (the task's acceptance criterion).

**Out of scope**: product detail, create, edit and delete (T6), toasts, dialogs, dark mode, elaborate animations, serving the SPA through Express (T7), Cypress e2e (T7).

## Capabilities

### New Capabilities

- `web-design-foundation`: tokens, base styles, responsiveness, focus, touch targets and contrast.
- `web-http-client`: REST client with timeout, cancellation, retry with backoff and typed errors, and the products API (listing).
- `product-dashboard`: home screen with list, debounced search, pagination and states.
- `web-app-structure`: minimal routing, development proxy and boundaries between component levels.

### Modified Capabilities

None.

## Impact

- **Code**: `apps/web/src` (styles, `lib/api`, `lib/router`, components, `App.svelte`, `main.ts`), `apps/web/vite.config.ts` and the root `eslint.config.js` (one rule). No new dependencies: Svelte 5, Testing Library, jsdom and Vitest are already installed.
- **Observable behavior**: `npm run dev` starts showing the real catalog at `http://localhost:5173` (with the API on `3000`).
- **Risks**: aesthetics are subjective and are the focus of the user's review; the layout verification uses real screenshots in a browser (Cypress's Electron), not all browsers.
