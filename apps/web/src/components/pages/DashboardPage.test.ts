import type { Product, ProductListResponse } from '@vynyl/shared';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api/api-error';
import type { ProductsApi } from '../../lib/api/products-api';
import DashboardPage from './DashboardPage.svelte';

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

const page = (products: Product[], total = products.length, offset = 0): ProductListResponse => ({
  data: products,
  total,
  limit: 30,
  offset,
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

// Fake timers drive the search debounce; flush() lets promises and Svelte updates settle.
const flush = () => vi.advanceTimersByTimeAsync(0);

const setup = (respond?: ProductsApi['list']) => {
  const list = vi.fn<ProductsApi['list']>(
    respond ?? (() => Promise.resolve(page([product(1)], 44))),
  );
  render(DashboardPage, { api: { list } });
  return { list };
};

const callArgs = (list: ReturnType<typeof setup>['list'], call: number) =>
  list.mock.calls[call]?.[0];

const search = async (text: string) => {
  await fireEvent.input(screen.getByRole('searchbox', { name: 'Search products' }), {
    target: { value: text },
  });
  await vi.advanceTimersByTimeAsync(300);
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('first load', () => {
    it('asks for the first 30 products, without a search, while showing a loading state', async () => {
      const pending = deferred<ProductListResponse>();
      const { list } = setup(() => pending.promise);
      await flush();

      expect(list).toHaveBeenCalledTimes(1);
      expect(callArgs(list, 0)).toEqual({ limit: 30, offset: 0, q: undefined });
      expect(list.mock.calls[0]?.[1]).toBeInstanceOf(AbortSignal);
      expect(screen.getByRole('status')).toHaveTextContent('Loading products…');
    });

    it('lists the products it receives with the pagination summary', async () => {
      setup(() => Promise.resolve(page([product(1, 'Flux Capacitor'), product(2)], 2)));
      await flush();

      expect(screen.getByRole('heading', { level: 1, name: 'Products' })).toBeInTheDocument();
      const table = screen.getByRole('table', { name: 'Products' });
      expect(within(table).getAllByRole('row')).toHaveLength(3);
      expect(within(table).getByText('Flux Capacitor')).toBeInTheDocument();
      expect(screen.getByText('Showing 1–2 of 2')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('makes one request, with the whole text, after the user stops typing', async () => {
      const { list } = setup();
      await flush();

      for (const text of ['f', 'fl', 'flux']) {
        await fireEvent.input(screen.getByRole('searchbox'), { target: { value: text } });
        await vi.advanceTimersByTimeAsync(100);
      }
      expect(list).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(200);

      expect(list).toHaveBeenCalledTimes(2);
      expect(callArgs(list, 1)).toEqual({ limit: 30, offset: 0, q: 'flux' });
    });

    it('trims the text and omits q when it is blank', async () => {
      const { list } = setup();
      await flush();

      await search('  flux  ');
      await search('   ');

      expect(callArgs(list, 1)).toEqual({ limit: 30, offset: 0, q: 'flux' });
      expect(callArgs(list, 2)).toEqual({ limit: 30, offset: 0, q: undefined });
    });

    it('goes back to the first page', async () => {
      const { list } = setup();
      await flush();
      await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      await flush();
      expect(callArgs(list, 1)).toEqual({ limit: 30, offset: 30, q: undefined });

      await search('flux');

      expect(callArgs(list, 2)).toEqual({ limit: 30, offset: 0, q: 'flux' });
    });

    it('does not reload when the applied search has not changed', async () => {
      const { list } = setup();
      await flush();

      await search('flux');
      await search('flux ');

      expect(list).toHaveBeenCalledTimes(2);
    });
  });

  describe('pagination', () => {
    it('requests the next and the previous page by offset', async () => {
      const { list } = setup();
      await flush();

      await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      await flush();
      await fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      await flush();

      expect(list.mock.calls.map(([params]) => params.offset)).toEqual([0, 30, 0]);
    });

    it('keeps the current products, marked as busy, while the next page loads', async () => {
      const next = deferred<ProductListResponse>();
      const list = vi
        .fn<ProductsApi['list']>()
        .mockResolvedValueOnce(page([product(1, 'First page item')], 31))
        .mockReturnValueOnce(next.promise);
      render(DashboardPage, { api: { list } });
      await flush();

      await fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      await flush();
      const busyList = screen.getByRole('table').closest('.product-list');
      expect(busyList).toHaveAttribute('aria-busy', 'true');
      expect(within(screen.getByRole('table')).getByText('First page item')).toBeInTheDocument();

      next.resolve(page([product(31, 'Second page item')], 31, 30));
      await flush();

      expect(busyList).toHaveAttribute('aria-busy', 'false');
      expect(within(screen.getByRole('table')).getByText('Second page item')).toBeInTheDocument();
      expect(screen.getByText('Showing 31–31 of 31')).toBeInTheDocument();
    });
  });

  describe('empty results', () => {
    it('explains that nothing matches and offers to clear the search', async () => {
      const { list } = setup((params) =>
        Promise.resolve(params.q ? page([], 0) : page([product(1)], 44)),
      );
      await flush();

      await search('zzz');

      expect(screen.getByRole('status')).toHaveTextContent('No products found');
      expect(screen.getByRole('status')).toHaveTextContent('Nothing matches “zzz”.');

      await fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
      await flush();

      expect(callArgs(list, 2)).toEqual({ limit: 30, offset: 0, q: undefined });
      expect(screen.getByRole('searchbox')).toHaveValue('');
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('says the catalog is empty, without a clear action, when there was no search', async () => {
      setup(() => Promise.resolve(page([], 0)));
      await flush();

      expect(screen.getByRole('status')).toHaveTextContent('The catalog is empty.');
      expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
    });
  });

  describe('errors', () => {
    it('shows an alert without technical details and repeats the request on "Try again"', async () => {
      const failure = new ApiError({ status: 503, code: 'UNKNOWN', message: 'secret internals' });
      const list = vi
        .fn<ProductsApi['list']>()
        .mockRejectedValueOnce(failure)
        .mockResolvedValueOnce(page([product(1, 'Recovered')], 1));
      render(DashboardPage, { api: { list } });
      await flush();

      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Could not load products');
      expect(alert).not.toHaveTextContent('secret internals');

      await fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      await flush();

      expect(list).toHaveBeenCalledTimes(2);
      expect(callArgs(list as ReturnType<typeof setup>['list'], 1)).toEqual(
        callArgs(list as ReturnType<typeof setup>['list'], 0),
      );
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByText('Recovered', { selector: 'th' })).toBeInTheDocument();
    });
  });

  describe('stale responses', () => {
    it('shows only the latest search when the responses arrive out of order', async () => {
      const first = deferred<ProductListResponse>();
      const second = deferred<ProductListResponse>();
      const list = vi
        .fn<ProductsApi['list']>()
        .mockResolvedValueOnce(page([product(1, 'Initial')], 44))
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      render(DashboardPage, { api: { list } });
      await flush();

      await search('a');
      await search('ab');
      expect(list).toHaveBeenCalledTimes(3);
      const signals = list.mock.calls.map(([, signal]) => signal);
      expect(signals[1]?.aborted).toBe(true);

      second.resolve(page([product(2, 'Answer to ab')], 1));
      await flush();
      first.resolve(page([product(3, 'Answer to a')], 1));
      await flush();

      const table = screen.getByRole('table');
      expect(within(table).getByText('Answer to ab')).toBeInTheDocument();
      expect(within(table).queryByText('Answer to a')).not.toBeInTheDocument();
    });

    it('ignores a failure from a request that was superseded', async () => {
      const first = deferred<ProductListResponse>();
      const list = vi
        .fn<ProductsApi['list']>()
        .mockReturnValueOnce(first.promise)
        .mockResolvedValueOnce(page([product(2, 'Latest')], 1));
      render(DashboardPage, { api: { list } });
      await flush();

      await search('latest');
      first.reject(new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' }));
      await flush();

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(within(screen.getByRole('table')).getByText('Latest')).toBeInTheDocument();
    });
  });
});
