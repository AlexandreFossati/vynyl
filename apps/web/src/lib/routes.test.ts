import { describe, expect, it } from 'vitest';
import { paths, resolveRoute } from './routes';

describe('resolveRoute', () => {
  it.each([
    ['/', { name: 'dashboard' }],
    ['/products/new', { name: 'product-create' }],
    ['/products/7', { name: 'product-detail', id: 7 }],
    ['/products/120', { name: 'product-detail', id: 120 }],
    ['/products/7/edit', { name: 'product-edit', id: 7 }],
  ])('maps %s to its page', (path, route) => {
    expect(resolveRoute(path)).toEqual(route);
  });

  it.each([
    '/products/abc',
    '/products/0',
    '/products/-1',
    '/products/1.5',
    '/products/007',
    '/products/1e2',
    '/products/%20',
    '/products/7/',
    '/products/7/delete',
    '/products/7/edit/extra',
    '/products/new/edit',
    '/products',
    '/products/',
    '/does-not-exist',
    '/api/products',
  ])('sends %s to the not found page', (path) => {
    expect(resolveRoute(path)).toEqual({ name: 'not-found' });
  });
});

describe('paths', () => {
  it('builds paths that resolve back to the same page', () => {
    expect(resolveRoute(paths.dashboard)).toEqual({ name: 'dashboard' });
    expect(resolveRoute(paths.productCreate)).toEqual({ name: 'product-create' });
    expect(resolveRoute(paths.product(42))).toEqual({ name: 'product-detail', id: 42 });
    expect(resolveRoute(paths.productEdit(42))).toEqual({ name: 'product-edit', id: 42 });
  });
});
