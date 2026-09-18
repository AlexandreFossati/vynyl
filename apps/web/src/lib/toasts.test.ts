import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createToasts } from './toasts.svelte';

describe('toasts', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts empty and shows what is reported, in order', () => {
    const toasts = createToasts();
    expect(toasts.items).toEqual([]);

    toasts.success('Product created');
    toasts.error('Could not save');

    expect(toasts.items.map(({ tone, message }) => ({ tone, message }))).toEqual([
      { tone: 'success', message: 'Product created' },
      { tone: 'error', message: 'Could not save' },
    ]);
  });

  it('gives every toast its own id', () => {
    const toasts = createToasts();

    toasts.success('One');
    toasts.success('One');

    expect(new Set(toasts.items.map((toast) => toast.id)).size).toBe(2);
  });

  it('closes a success after 5 seconds', () => {
    const toasts = createToasts();
    toasts.success('Saved');

    vi.advanceTimersByTime(4_999);
    expect(toasts.items).toHaveLength(1);
    vi.advanceTimersByTime(1);

    expect(toasts.items).toHaveLength(0);
  });

  it('keeps an error for 8 seconds', () => {
    const toasts = createToasts();
    toasts.error('Could not save');

    vi.advanceTimersByTime(7_999);
    expect(toasts.items).toHaveLength(1);
    vi.advanceTimersByTime(1);

    expect(toasts.items).toHaveLength(0);
  });

  it('closes each toast on its own schedule', () => {
    const toasts = createToasts();
    toasts.success('First');
    vi.advanceTimersByTime(3_000);
    toasts.success('Second');

    vi.advanceTimersByTime(2_000);
    expect(toasts.items.map((toast) => toast.message)).toEqual(['Second']);
    vi.advanceTimersByTime(3_000);

    expect(toasts.items).toEqual([]);
  });

  it('dismisses only the toast asked for and leaves no pending timer for it', () => {
    const toasts = createToasts();
    toasts.success('First');
    toasts.success('Second');
    const [first] = toasts.items;

    toasts.dismiss(first!.id);

    expect(toasts.items.map((toast) => toast.message)).toEqual(['Second']);
    expect(vi.getTimerCount()).toBe(1);
  });

  it('ignores a dismissal of a toast that is already gone', () => {
    const toasts = createToasts();
    toasts.success('Saved');
    const [only] = toasts.items;
    vi.advanceTimersByTime(5_000);

    expect(() => toasts.dismiss(only!.id)).not.toThrow();
    expect(toasts.items).toEqual([]);
  });
});
