import type { Product } from '@vynyl/shared';
import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api/api-error';
import type { ProductsApi } from '../../lib/api/products-api';
import { SAVE_FAILED_MESSAGE } from '../../lib/product-form';
import { fillForm, typeInto } from '../../test/product-form';
import ProductCreatePage from './ProductCreatePage.svelte';

const created: Product = {
  id: 45,
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

const setup = (create: ProductsApi['create'] = () => Promise.resolve(created)) => {
  const spy = vi.fn<ProductsApi['create']>(create);
  const notify = { success: vi.fn(), error: vi.fn() };
  render(ProductCreatePage, { props: { api: { create: spy }, notify } });
  return { create: spy, notify };
};

const submit = async () => {
  await fireEvent.click(screen.getByRole('button', { name: /Create product|Saving/ }));
  await flush();
};

const apiError = (status: number, code: ApiError['code'], details?: ApiError['details']) =>
  new ApiError({ status, code, message: 'server wording', ...(details ? { details } : {}) });

describe('ProductCreatePage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/products/new');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows an empty form under the heading "New product"', () => {
    setup();

    expect(screen.getByRole('heading', { level: 1, name: 'New product' })).toBeVisible();
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Create product' })).toBeEnabled();
  });

  it('does not call the API while the values are invalid', async () => {
    const { create, notify } = setup();

    await submit();

    expect(create).not.toHaveBeenCalled();
    expect(notify.error).not.toHaveBeenCalled();
    expect(screen.getAllByText('Required')).toHaveLength(8);
  });

  describe('when the product is created', () => {
    it('sends the values, tells the user and opens the new product', async () => {
      const { create, notify } = setup();
      await fillForm();

      await submit();

      expect(create).toHaveBeenCalledTimes(1);
      expect(create.mock.calls[0]?.[0]).toEqual({
        title: 'Large Flux Capacitor',
        description: 'Powers time travel.',
        category: 'dimensional-travel',
        price: 19.99,
        stock: 42,
        brand: 'ACME',
        sku: 'ACM-FC-001',
        weight: 4.5,
      });
      expect(notify.success).toHaveBeenCalledWith('Product created');
      expect(notify.error).not.toHaveBeenCalled();
      expect(window.location.pathname).toBe('/products/45');
    });
  });

  describe('while the product is being saved', () => {
    it('disables the form and sends the request only once', async () => {
      const pending = deferred<Product>();
      const { create } = setup(() => pending.promise);
      await fillForm();

      await submit();
      const saving = screen.getByRole('button', { name: 'Saving…' });
      await fireEvent.submit(saving.closest('form')!);
      await flush();

      expect(saving).toBeDisabled();
      expect(create).toHaveBeenCalledTimes(1);

      pending.resolve(created);
      await flush();
    });
  });

  describe('when the server refuses', () => {
    it('shows a duplicate SKU on the SKU field, keeps every value and lets the user try again', async () => {
      const create = vi
        .fn<ProductsApi['create']>()
        .mockRejectedValueOnce(apiError(409, 'SKU_CONFLICT'))
        .mockResolvedValueOnce(created);
      const { notify } = setup(create);
      await fillForm();

      await submit();

      const sku = screen.getByLabelText('SKU');
      expect(sku).toHaveAccessibleDescription('This SKU is already in use');
      expect(sku).toHaveFocus();
      expect(screen.getByLabelText('Title')).toHaveValue('Large Flux Capacitor');
      expect(screen.getByRole('button', { name: 'Create product' })).toBeEnabled();
      expect(notify.error).not.toHaveBeenCalled();
      expect(window.location.pathname).toBe('/products/new');

      await typeInto('SKU', 'ACM-FC-002');
      await submit();

      expect(create).toHaveBeenCalledTimes(2);
      expect(create.mock.calls[1]?.[0]).toMatchObject({ sku: 'ACM-FC-002' });
      expect(window.location.pathname).toBe('/products/45');
    });

    it('shows the validation errors of the server on their fields', async () => {
      const failure = apiError(400, 'VALIDATION_ERROR', [
        { path: 'price', message: 'too small' },
        { path: 'weight', message: 'must be positive' },
      ]);
      const { notify } = setup(() => Promise.reject(failure));
      await fillForm();

      await submit();

      expect(screen.getByLabelText('Price')).toHaveAccessibleDescription('Too small');
      expect(screen.getByLabelText('Weight')).toHaveAccessibleDescription('Must be positive');
      expect(notify.error).not.toHaveBeenCalled();
    });

    it('reports what no field can explain in a toast', async () => {
      const failure = apiError(400, 'VALIDATION_ERROR', [
        { path: 'meta.createdAt', message: 'not allowed' },
      ]);
      const { notify } = setup(() => Promise.reject(failure));
      await fillForm();

      await submit();

      expect(notify.error).toHaveBeenCalledWith(SAVE_FAILED_MESSAGE);
    });

    it.each([
      ['a server error', apiError(500, 'INTERNAL_ERROR')],
      ['a network failure', apiError(0, 'NETWORK_ERROR')],
    ])(
      'reports %s in a generic toast, keeps the values and re-enables the form',
      async (_name, failure) => {
        const { notify } = setup(() => Promise.reject(failure));
        await fillForm();

        await submit();

        expect(notify.error).toHaveBeenCalledWith(SAVE_FAILED_MESSAGE);
        expect(notify.error).not.toHaveBeenCalledWith(expect.stringContaining('server wording'));
        expect(screen.getByLabelText('Title')).toHaveValue('Large Flux Capacitor');
        expect(screen.getByRole('button', { name: 'Create product' })).toBeEnabled();
        expect(window.location.pathname).toBe('/products/new');
      },
    );
  });

  it('goes back to the dashboard on "Cancel", without calling the API', async () => {
    const { create } = setup();
    await fillForm();

    await fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(window.location.pathname).toBe('/');
    expect(create).not.toHaveBeenCalled();
  });
});
