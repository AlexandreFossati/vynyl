export interface Singleflight {
  do<T>(key: string, loader: () => Promise<T>): Promise<T>;
}

// Concurrent calls with the same key share one execution of `loader`. It is not a cache: the key is
// released as soon as the execution settles, so the next call runs the loader again.
//
// Note: against a local SQLite file the query runs on the main thread, so requests rarely overlap
// and this coalesces almost nothing. It pays off when the data source is slow and asynchronous
// (a networked database, worker threads).
export function createSingleflight(): Singleflight {
  const inFlight = new Map<string, Promise<unknown>>();

  return {
    do<T>(key: string, loader: () => Promise<T>): Promise<T> {
      const existing = inFlight.get(key);
      if (existing) {
        return existing as Promise<T>;
      }

      // The async wrapper turns a synchronous throw from the loader into a rejection.
      const promise = (async () => loader())();
      inFlight.set(key, promise);

      const release = () => {
        if (inFlight.get(key) === promise) {
          inFlight.delete(key);
        }
      };
      // Handling both outcomes here keeps the cleanup branch from raising an unhandled rejection;
      // each caller still receives (and handles) the original promise.
      promise.then(release, release);

      return promise;
    },
  };
}
