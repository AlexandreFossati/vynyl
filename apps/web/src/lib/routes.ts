// Which page a URL path shows, and the paths the app links to. Kept pure (no browser state) so
// the mapping is easy to test; router.svelte.ts holds the current path.
export type Route =
  | { name: 'dashboard' }
  | { name: 'product-create' }
  | { name: 'product-detail'; id: number }
  | { name: 'product-edit'; id: number }
  | { name: 'not-found' };

export const paths = {
  dashboard: '/',
  productCreate: '/products/new',
  product: (id: number) => `/products/${id}`,
  productEdit: (id: number) => `/products/${id}/edit`,
};

// The canonical form of a positive integer: "007", "0", "1.5" and "abc" are not product ids.
const PRODUCT_ID = /^[1-9]\d*$/;

export function resolveRoute(path: string): Route {
  if (path === paths.dashboard) {
    return { name: 'dashboard' };
  }
  if (path === paths.productCreate) {
    return { name: 'product-create' };
  }

  const [, section, id, action, ...rest] = path.split('/');
  if (section === 'products' && id !== undefined && PRODUCT_ID.test(id) && rest.length === 0) {
    if (action === undefined) {
      return { name: 'product-detail', id: Number(id) };
    }
    if (action === 'edit') {
      return { name: 'product-edit', id: Number(id) };
    }
  }
  return { name: 'not-found' };
}
