import type { Product } from '@vynyl/shared';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api/api-error';
import type { ProductsApi } from '../../lib/api/products-api';
import { SAVE_FAILED_MESSAGE } from '../../lib/product-form';
import { typeInto } from '../../test/product-form';
import ProductEditPage from './ProductEditPage.svelte';

const existing: Product = {
  id: 7,
  title: 'Large Flux Capacitor',
  description: 'Powers time travel.',
  category: 'dimensional-travel',
  price: 19.99,
  stock: 42,
  brand: 'ACME',
  sku: 'ACM-FC-001',
  weight: 4.5,
  meta: { createdAt: '2025-04-30T09:41:02.053Z', updatedAt: '2025-04-30T09:41:02.053Z' },
};

// A promise the test settles by hand, to control when the server answers.
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

const apiError = (status: number, code: ApiError['code'], details?: ApiError['details']) =>
  new ApiError({ status, code, message: 'server wording', ...(details ? { details } : {}) });

const setup = (
  overrides: { get?: ProductsApi['get']; update?: ProductsApi['update'] } = {},
  id = 7,
) => {
  const get = vi.fn<ProductsApi['get']>(overrides.get ?? (() => Promise.resolve(existing)));
  const update = vi.fn<ProductsApi['update']>(
    overrides.update ??
      ((productId, input) => Promise.resolve({ ...existing, ...input, id: productId })),
  );
  const notify = { success: vi.fn(), error: vi.fn() };
  const view = render(ProductEditPage, { props: { id, api: { get, update }, notify } });
  return { ...view, get, update, notify };
};

const save = async () => {
  await fireEvent.click(screen.getByRole('button', { name: /Save changes|Saving/ }));
  await flush();
};

describe('ProductEditPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/products/7/edit');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('loading the product', () => {
    it('asks for the product of the id, showing a loading state meanwhile', async () => {
      const pending = deferred<Product>();
      const { get } = setup({ get: () => pending.promise });
      await flush();

      expect(get.mock.calls[0]?.[0]).toBe(7);
      expect(screen.getByRole('status')).toHaveTextContent('Loading product…');
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    });

    it('fills the form with the values of the product', async () => {
      setup();
      await flush();

      expect(screen.getByRole('heading', { level: 1, name: 'Edit product' })).toBeVisible();
      expect(screen.getByLabelText('Title')).toHaveValue('Large Flux Capacitor');
      expect(screen.getByLabelText('Price')).toHaveValue('19.99');
      expect(screen.getByLabelText('Stock')).toHaveValue('42');
      expect(screen.getByLabelText('SKU')).toHaveValue('ACM-FC-001');
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    });

    it('says the product was not found, and offers the way back', async () => {
      setup({ get: () => Promise.reject(apiError(404, 'PRODUCT_NOT_FOUND')) });
      await flush();

      expect(screen.getByRole('status')).toHaveTextContent('Product not found');
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();

      await fireEvent.click(screen.getByRole('button', { name: 'Back to products' }));

      expect(window.location.pathname).toBe('/');
    });

    it('shows an alert without technical details and repeats the request on "Try again"', async () => {
      const get = vi
        .fn<ProductsApi['get']>()
        .mockRejectedValueOnce(apiError(503, 'UNKNOWN'))
        .mockResolvedValueOnce(existing);
      setup({ get });
      await flush();

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Could not load the product');
      expect(alert).not.toHaveTextContent('server wording');

      await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      await flush();

      expect(get).toHaveBeenCalledTimes(2);
      expect(screen.getByLabelText('Title')).toHaveValue('Large Flux Capacitor');
    });
  });

  describe('saving', () => {
    it('sends every field of the form, tells the user and opens the product', async () => {
      const { update, notify } = setup();
      await flush();
      await typeInto('Stock', '40');

      await save();

      expect(update).toHaveBeenCalledTimes(1);
      expect(update.mock.calls[0]?.[0]).toBe(7);
      expect(update.mock.calls[0]?.[1]).toEqual({
        title: 'Large Flux Capacitor',
        description: 'Powers time travel.',
        category: 'dimensional-travel',
        price: 19.99,
        stock: 40,
        brand: 'ACME',
        sku: 'ACM-FC-001',
        weight: 4.5,
      });
      expect(notify.success).toHaveBeenCalledWith('Product updated');
      expect(window.location.pathname).toBe('/products/7');
    });

    it('does not call the API while a value is invalid', async () => {
      const { update } = setup();
      await flush();
      await typeInto('Price', '');

      await save();

      expect(update).not.toHaveBeenCalled();
      expect(screen.getByLabelText('Price')).toHaveAccessibleDescription('Required');
    });

    it('disables the form and sends the request only once while it is saving', async () => {
      const pending = deferred<Product>();
      const { update } = setup({ update: () => pending.promise });
      await flush();

      await save();
      const saving = screen.getByRole('button', { name: 'Saving…' });
      await fireEvent.submit(saving.closest('form')!);
      await flush();

      expect(saving).toBeDisabled();
      expect(update).toHaveBeenCalledTimes(1);

      pending.resolve(existing);
      await flush();
    });
  });

  describe('when the server refuses', () => {
    it('shows a duplicate SKU on the SKU field and keeps the edits', async () => {
      const { notify } = setup({ update: () => Promise.reject(apiError(409, 'SKU_CONFLICT')) });
      await flush();
      await typeInto('SKU', 'TAKEN-1');
      await typeInto('Stock', '1');

      await save();

      const sku = screen.getByLabelText('SKU');
      expect(sku).toHaveAccessibleDescription('This SKU is already in use');
      expect(sku).toHaveFocus();
      expect(sku).toHaveValue('TAKEN-1');
      expect(screen.getByLabelText('Stock')).toHaveValue('1');
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
      expect(notify.error).not.toHaveBeenCalled();
      expect(window.location.pathname).toBe('/products/7/edit');
    });

    it('shows the validation errors of the server on their fields', async () => {
      const failure = apiError(400, 'VALIDATION_ERROR', [{ path: 'stock', message: 'too small' }]);
      const { notify } = setup({ update: () => Promise.reject(failure) });
      await flush();

      await save();

      expect(screen.getByLabelText('Stock')).toHaveAccessibleDescription('Too small');
      expect(notify.error).not.toHaveBeenCalled();
    });

    it('reports another failure in a generic toast and keeps the edits', async () => {
      const { notify } = setup({ update: () => Promise.reject(apiError(500, 'INTERNAL_ERROR')) });
      await flush();
      await typeInto('Title', 'Renamed');

      await save();

      expect(notify.error).toHaveBeenCalledWith(SAVE_FAILED_MESSAGE);
      expect(screen.getByLabelText('Title')).toHaveValue('Renamed');
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled();
    });

    it('tells the user when the product was deleted meanwhile, and goes to the dashboard', async () => {
      const { notify } = setup({
        update: () => Promise.reject(apiError(404, 'PRODUCT_NOT_FOUND')),
      });
      await flush();

      await save();

      expect(notify.error).toHaveBeenCalledWith('This product no longer exists.');
      expect(window.location.pathname).toBe('/');
    });
  });

  it('goes back to the product on "Cancel", without calling the API', async () => {
    const { update } = setup();
    await flush();
    await typeInto('Title', 'Renamed');

    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(window.location.pathname).toBe('/products/7');
    expect(update).not.toHaveBeenCalled();
  });
});
