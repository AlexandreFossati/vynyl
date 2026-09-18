import type { Product } from '@vynyl/shared';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App.svelte';
import { ApiError } from './lib/api/api-error';
import { fillForm } from './test/product-form';

const product: Product = {
  id: 7,
  title: 'Flux Capacitor',
  description: 'Powers time travel.',
  category: 'automotive',
  price: 19.99,
  stock: 42,
  brand: 'ACME',
  sku: 'ACM-FC-001',
  weight: 4.5,
  meta: { createdAt: '2025-04-30T09:41:02.053Z', updatedAt: '2025-04-30T09:41:02.053Z' },
};

// The pages would call the real API; give them one that answers from memory.
const api = vi.hoisted(() => ({
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('./lib/api/products-api', () => ({ productsApi: api }));

// What the browser does when the user presses Back: change the URL, then fire popstate.
const goBackTo = (path: string) => {
  window.history.replaceState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

describe('App routing', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.list.mockResolvedValue({ data: [], total: 0, limit: 30, offset: 0 });
    api.get.mockResolvedValue(product);
    goBackTo('/');
  });

  it('shows the dashboard at /', async () => {
    render(App);

    expect(await screen.findByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Product Catalog' })).toHaveAttribute('href', '/');
  });

  it('shows the not found page, with a way back, for an unknown path', async () => {
    render(App);
    goBackTo('/does-not-exist');

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to products' })).toHaveAttribute('href', '/');
    expect(screen.queryByRole('heading', { name: 'Products' })).not.toBeInTheDocument();
  });

  it('goes back to the dashboard from the not found page without reloading', async () => {
    render(App);
    goBackTo('/does-not-exist');
    await fireEvent.click(await screen.findByRole('link', { name: 'Back to products' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/');
  });

  it('follows the browser history', async () => {
    render(App);
    goBackTo('/somewhere');
    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();

    goBackTo('/');

    expect(await screen.findByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument();
  });

  describe('product routes', () => {
    it('shows the empty form at /products/new', async () => {
      render(App);
      goBackTo('/products/new');

      expect(await screen.findByRole('heading', { name: 'New product' })).toBeInTheDocument();
      expect(screen.getByLabelText('Title')).toHaveValue('');
    });

    it('loads and shows the product at /products/:id', async () => {
      render(App);
      goBackTo('/products/7');

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Flux Capacitor' }),
      ).toBeVisible();
      expect(api.get).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    });

    it('loads the product into the form at /products/:id/edit', async () => {
      render(App);
      goBackTo('/products/7/edit');

      expect(await screen.findByRole('heading', { name: 'Edit product' })).toBeInTheDocument();
      expect(await screen.findByLabelText('Title')).toHaveValue('Flux Capacitor');
      expect(api.get).toHaveBeenCalledWith(7, expect.any(AbortSignal));
    });

    it.each(['/products/abc', '/products/0', '/products/007', '/products/7/'])(
      'shows the not found page for %s, without calling the API',
      async (path) => {
        render(App);
        goBackTo(path);

        expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
        expect(api.get).not.toHaveBeenCalled();
      },
    );

    it('opens a product from its title in the list, and comes back with the browser history', async () => {
      api.list.mockResolvedValue({ data: [product], total: 1, limit: 30, offset: 0 });
      render(App);

      const [titleLink] = await screen.findAllByRole('link', { name: 'Flux Capacitor' });
      await fireEvent.click(titleLink!);

      expect(await screen.findByRole('link', { name: 'Edit' })).toHaveAttribute(
        'href',
        '/products/7/edit',
      );
      expect(window.location.pathname).toBe('/products/7');

      goBackTo('/');
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Products' }),
      ).toBeInTheDocument();
    });

    it('starts creating a product from the dashboard', async () => {
      render(App);

      await fireEvent.click(await screen.findByRole('link', { name: 'Add product' }));

      expect(await screen.findByRole('heading', { name: 'New product' })).toBeInTheDocument();
      expect(window.location.pathname).toBe('/products/new');
    });
  });

  describe('notifications', () => {
    it('keeps the success toast visible on the page the action leads to', async () => {
      api.create.mockResolvedValue({ ...product, id: 45 });
      render(App);
      goBackTo('/products/new');
      await screen.findByRole('heading', { name: 'New product' });

      await fillForm();
      await fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

      expect(
        await screen.findByRole('heading', { level: 1, name: 'Flux Capacitor' }),
      ).toBeVisible();
      expect(window.location.pathname).toBe('/products/45');
      expect(await screen.findByText('Product created')).toBeVisible();
    });

    it('shows an error toast, and lets the user dismiss it', async () => {
      api.create.mockRejectedValue(
        new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'boom' }),
      );
      render(App);
      goBackTo('/products/new');
      await screen.findByRole('heading', { name: 'New product' });

      await fillForm();
      await fireEvent.click(screen.getByRole('button', { name: 'Create product' }));

      expect(await screen.findByRole('alert')).toHaveTextContent('Could not save the product');

      await fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
