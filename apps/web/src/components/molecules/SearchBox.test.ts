import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SearchBox from './SearchBox.svelte';

describe('SearchBox', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const type = (text: string) =>
    fireEvent.input(screen.getByRole('searchbox', { name: 'Search products' }), {
      target: { value: text },
    });

  it('offers a labelled search field limited to 100 characters', () => {
    render(SearchBox, { onsearch: vi.fn() });

    const field = screen.getByRole('searchbox', { name: 'Search products' });
    expect(field).toHaveAttribute('maxlength', '100');
  });

  it('shows the value it is given', () => {
    render(SearchBox, { onsearch: vi.fn(), value: 'flux' });

    expect(screen.getByRole('searchbox')).toHaveValue('flux');
  });

  it('searches once, with the full text, after the user pauses for 300 ms', async () => {
    const onsearch = vi.fn();
    render(SearchBox, { onsearch });

    await type('f');
    await vi.advanceTimersByTimeAsync(100);
    await type('fl');
    await vi.advanceTimersByTimeAsync(100);
    await type('flux');
    await vi.advanceTimersByTimeAsync(299);
    expect(onsearch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(onsearch).toHaveBeenCalledExactlyOnceWith('flux');
  });

  it('searches again after a later pause', async () => {
    const onsearch = vi.fn();
    render(SearchBox, { onsearch });

    await type('flux');
    await vi.advanceTimersByTimeAsync(300);
    await type('');
    await vi.advanceTimersByTimeAsync(300);

    expect(onsearch.mock.calls).toEqual([['flux'], ['']]);
  });

  it('does not search after it has been removed', async () => {
    const onsearch = vi.fn();
    const { unmount } = render(SearchBox, { onsearch });

    await type('flux');
    unmount();
    await vi.advanceTimersByTimeAsync(1000);

    expect(onsearch).not.toHaveBeenCalled();
  });
});
