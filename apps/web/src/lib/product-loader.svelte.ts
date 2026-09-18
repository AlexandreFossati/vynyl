import type { Product } from '@vynyl/shared';
import { ApiError } from './api/api-error';
import type { ProductsApi } from './api/products-api';

export type ProductLoad =
  | { status: 'loading' }
  | { status: 'ready'; product: Product }
  | { status: 'not-found' }
  | { status: 'error' };

// Loads one product for a page, and reloads it when the id changes. Like the dashboard, starting
// a request cancels the previous one and the answer of a cancelled request is ignored, so only
// the latest request can change what is shown. `api` and `id` are functions so that the loader
// follows the page's props. Call it while a component initializes: it registers an effect.
export function createProductLoader(source: {
  api: () => Pick<ProductsApi, 'get'>;
  id: () => number;
}) {
  let current = $state<ProductLoad>({ status: 'loading' });
  let inFlight: AbortController | undefined;

  function load() {
    inFlight?.abort();
    const controller = new AbortController();
    inFlight = controller;
    current = { status: 'loading' };

    source
      .api()
      .get(source.id(), controller.signal)
      .then(
        (product) => {
          if (controller.signal.aborted) return;
          current = { status: 'ready', product };
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          const missing = error instanceof ApiError && error.code === 'PRODUCT_NOT_FOUND';
          current = missing ? { status: 'not-found' } : { status: 'error' };
        },
      );
  }

  $effect(() => {
    load();
    return () => inFlight?.abort();
  });

  return {
    get current() {
      return current;
    },
    // "Try again": repeats the same request, starting again from the loading state.
    reload: load,
  };
}
