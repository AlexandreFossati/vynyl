import type { Product } from '@vynyl/shared';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api/api-error';
import type { ProductsApi } from '../../lib/api/products-api';
import ProductDetailPage from './ProductDetailPage.svelte';

const product = (id: number, title = `Product ${id}`): Product => ({
  id,
  title,
  description: 'A product.',
  category: 'tools',
  price: 10,
  stock: 20,
  brand: 'ACME',
  sku: `SKU-${id}`,
  weight: 1,
  meta: { createdAt: '2025-04-30T09:41:02.053Z', updatedAt: '2025-04-30T09:41:02.053Z' },
});

// A promise the test settles by hand, to control the order in which responses arrive.
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

// Fake timers keep the tests off the real clock; flush() lets promises and Svelte updates settle.
const flush = () => vi.advanceTimersByTimeAsync(0);

type DetailApi = Pick<ProductsApi, 'get' | 'remove'>;

const setup = (overrides: Partial<DetailApi> = {}, id = 1) => {
  const get = vi.fn<ProductsApi['get']>(
    overrides.get ?? ((productId) => Promise.resolve(product(productId, 'Flux Capacitor'))),
  );
  const remove = vi.fn<ProductsApi['remove']>(overrides.remove ?? (() => Promise.resolve()));
  const notify = { success: vi.fn(), error: vi.fn() };
  const view = render(ProductDetailPage, { props: { id, api: { get, remove }, notify } });
  return { ...view, get, remove, notify };
};

const notFound = () =>
  new ApiError({ status: 404, code: 'PRODUCT_NOT_FOUND', message: 'Product 1 not found' });

const openDeleteDialog = async () => {
  await fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  return screen.getByRole('dialog', { name: 'Delete product?' });
};

describe('ProductDetailPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/products/1');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loading the product', () => {
    it('asks for the product of the id it is given, showing a loading state meanwhile', async () => {
      const pending = deferred<Product>();
      const { get } = setup({ get: () => pending.promise }, 7);
      await flush();

      expect(get).toHaveBeenCalledTimes(1);
      expect(get.mock.calls[0]?.[0]).toBe(7);
      expect(get.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
      expect(screen.getByRole('status')).toHaveTextContent('Loading product…');
    });

    it('shows the product with the way back, the edit link and the delete button', async () => {
      setup({}, 1);
      await flush();

      expect(screen.getByRole('heading', { level: 1, name: 'Flux Capacitor' })).toBeVisible();
      expect(screen.getByRole('link', { name: 'Back to products' })).toHaveAttribute('href', '/');
      expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
        'href',
        '/products/1/edit',
      );
      expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
    });

    it('says the product was not found, and offers the way back', async () => {
      setup({ get: () => Promise.reject(notFound()) });
      await flush();

      expect(screen.getByRole('status')).toHaveTextContent('Product not found');
      expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();

      await fireEvent.click(screen.getByRole('button', { name: 'Back to products' }));

      expect(window.location.pathname).toBe('/');
    });

    it('shows an alert without technical details and repeats the request on "Try again"', async () => {
      const get = vi
        .fn<ProductsApi['get']>()
        .mockRejectedValueOnce(new ApiError({ status: 503, code: 'UNKNOWN', message: 'secret' }))
        .mockResolvedValueOnce(product(1, 'Recovered'));
      setup({ get });
      await flush();

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Could not load the product');
      expect(alert).not.toHaveTextContent('secret');

      await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      await flush();

      expect(get).toHaveBeenCalledTimes(2);
      expect(get.mock.calls[1]?.[0]).toBe(1);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Recovered' })).toBeVisible();
    });

    it('shows only the latest product when the id changes and the old answer arrives late', async () => {
      const first = deferred<Product>();
      const get = vi
        .fn<ProductsApi['get']>()
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce(product(2, 'Second product'));
      const { rerender } = setup({ get }, 1);
      await flush();

      await rerender({ id: 2 });
      await flush();
      expect(get.mock.calls[0]?.[1]?.aborted).toBe(true);
      first.resolve(product(1, 'First product'));
      await flush();

      expect(screen.getByRole('heading', { level: 1, name: 'Second product' })).toBeVisible();
      expect(screen.queryByText('First product')).not.toBeInTheDocument();
    });

    it('ignores a failure of a request that was replaced', async () => {
      const first = deferred<Product>();
      const get = vi
        .fn<ProductsApi['get']>()
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce(product(2, 'Second product'));
      const { rerender } = setup({ get }, 1);
      await flush();

      await rerender({ id: 2 });
      first.reject(new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' }));
      await flush();

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 1, name: 'Second product' })).toBeVisible();
    });
  });

  describe('deleting', () => {
    it('asks for confirmation, naming the product, before doing anything', async () => {
      const { remove } = setup();
      await flush();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      const dialog = await openDeleteDialog();

      expect(dialog).toHaveAccessibleDescription('“Flux Capacitor” will be permanently removed.');
      expect(remove).not.toHaveBeenCalled();
    });

    it('closes the dialog and keeps the product when the user cancels', async () => {
      const { remove } = setup();
      await flush();
      const dialog = await openDeleteDialog();

      await fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(remove).not.toHaveBeenCalled();
      expect(screen.getByRole('heading', { level: 1, name: 'Flux Capacitor' })).toBeVisible();
    });

    it('closes the dialog on Esc, without deleting', async () => {
      const { remove } = setup();
      await flush();
      const dialog = await openDeleteDialog();

      await fireEvent(dialog, new Event('cancel', { cancelable: true }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(remove).not.toHaveBeenCalled();
    });

    it('deletes the product once it is confirmed, tells the user and goes to the dashboard', async () => {
      const { remove, notify } = setup({}, 1);
      await flush();
      const dialog = await openDeleteDialog();

      await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await flush();

      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove.mock.calls[0]?.[0]).toBe(1);
      expect(notify.success).toHaveBeenCalledWith('Product deleted');
      expect(notify.error).not.toHaveBeenCalled();
      expect(window.location.pathname).toBe('/');
    });

    it('locks the dialog while the request runs and sends it only once', async () => {
      const pending = deferred<void>();
      const { remove } = setup({ remove: () => pending.promise });
      await flush();
      const dialog = await openDeleteDialog();
      const confirm = within(dialog).getByRole('button', { name: 'Delete' });

      await fireEvent.click(confirm);
      await fireEvent.click(confirm);
      await fireEvent(dialog, new Event('cancel', { cancelable: true }));

      expect(remove).toHaveBeenCalledTimes(1);
      expect(confirm).toBeDisabled();
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      pending.resolve();
      await flush();
    });

    it('tells the user the product is already gone, and goes to the dashboard', async () => {
      const { notify } = setup({ remove: () => Promise.reject(notFound()) });
      await flush();
      const dialog = await openDeleteDialog();

      await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await flush();

      expect(notify.error).toHaveBeenCalledWith('This product no longer exists.');
      expect(notify.success).not.toHaveBeenCalled();
      expect(window.location.pathname).toBe('/');
    });

    it('closes the dialog, reports a generic error and stays on the product when it fails', async () => {
      const failure = new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'stack trace' });
      const { notify } = setup({ remove: () => Promise.reject(failure) });
      await flush();
      const dialog = await openDeleteDialog();

      await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
      await flush();

      expect(notify.error).toHaveBeenCalledWith('Could not delete the product. Please try again.');
      expect(notify.success).not.toHaveBeenCalled();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(window.location.pathname).toBe('/products/1');
      expect(screen.getByRole('heading', { level: 1, name: 'Flux Capacitor' })).toBeVisible();
    });
  });
});
