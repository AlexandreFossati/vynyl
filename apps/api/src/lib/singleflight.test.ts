import { describe, expect, it, vi } from 'vitest';
import { createSingleflight } from './singleflight';

// A promise the test settles by hand, so overlap between calls is deterministic.
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('singleflight', () => {
  it('runs the loader once for simultaneous calls with the same key and shares the result', async () => {
    const singleflight = createSingleflight();
    const pending = deferred<string>();
    const loader = vi.fn(() => pending.promise);

    const calls = Array.from({ length: 5 }, () => singleflight.do('k', loader));
    pending.resolve('value');
    const results = await Promise.all(calls);

    expect(loader).toHaveBeenCalledTimes(1);
    expect(results).toEqual(['value', 'value', 'value', 'value', 'value']);
  });

  it('runs the loader once per distinct key', async () => {
    const singleflight = createSingleflight();
    const first = deferred<string>();
    const second = deferred<string>();
    const loaderA = vi.fn(() => first.promise);
    const loaderB = vi.fn(() => second.promise);

    const a = singleflight.do('a', loaderA);
    const b = singleflight.do('b', loaderB);
    first.resolve('A');
    second.resolve('B');

    expect(await Promise.all([a, b])).toEqual(['A', 'B']);
    expect(loaderA).toHaveBeenCalledTimes(1);
    expect(loaderB).toHaveBeenCalledTimes(1);
  });

  it('does not cache: a call after the previous one finished runs the loader again', async () => {
    const singleflight = createSingleflight();
    const loader = vi.fn().mockResolvedValueOnce('first').mockResolvedValueOnce('second');

    expect(await singleflight.do('k', loader)).toBe('first');
    expect(await singleflight.do('k', loader)).toBe('second');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('shares a failure with every waiter and frees the key for the next call', async () => {
    const singleflight = createSingleflight();
    const pending = deferred<string>();
    const failing = vi.fn(() => pending.promise);

    const calls = [singleflight.do('k', failing), singleflight.do('k', failing)];
    const settled = Promise.allSettled(calls);
    pending.reject(new Error('boom'));

    const results = await settled;
    expect(results.map((r) => r.status)).toEqual(['rejected', 'rejected']);
    expect(failing).toHaveBeenCalledTimes(1);

    const succeeding = vi.fn().mockResolvedValue('recovered');
    expect(await singleflight.do('k', succeeding)).toBe('recovered');
    expect(succeeding).toHaveBeenCalledTimes(1);
  });

  it('turns a loader that throws synchronously into a rejection and frees the key', async () => {
    const singleflight = createSingleflight();
    const throwing = () => {
      throw new Error('sync boom');
    };

    await expect(singleflight.do('k', throwing)).rejects.toThrow('sync boom');

    const loader = vi.fn().mockResolvedValue('ok');
    expect(await singleflight.do('k', loader)).toBe('ok');
  });

  it('does not raise an unhandled rejection when the shared execution fails', async () => {
    const singleflight = createSingleflight();
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    try {
      await singleflight.do('k', () => Promise.reject(new Error('boom'))).catch(() => undefined);
      // Unhandled rejections are reported after the microtask queue drains.
      await new Promise((resolve) => setImmediate(resolve));

      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
