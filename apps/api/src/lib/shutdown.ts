import type { Server } from 'node:http';
import type { Logger } from 'pino';

export interface ShutdownOptions {
  server: Pick<Server, 'close' | 'closeAllConnections'>;
  closeDatabase: () => void | Promise<void>;
  logger: Logger;
  // How long in-flight requests get to finish before their connections are cut.
  timeoutMs: number;
  // Injected so tests can observe the exit code without ending the process.
  exit: (code: number) => void;
}

const closeServer = (server: ShutdownOptions['server']) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

// Graceful shutdown: stop accepting connections, let in-flight requests finish, close the
// database, then exit. If the requests outlive the timeout their connections are cut, and the
// exit code reports it (1). Only the first call does anything.
export function createShutdown(options: ShutdownOptions): (signal: string) => Promise<void> {
  const { server, closeDatabase, logger, timeoutMs, exit } = options;
  let started = false;

  return async (signal) => {
    if (started) {
      return;
    }
    started = true;
    logger.info({ signal }, 'Shutdown started');

    let forced = false;
    const forceTimer = setTimeout(() => {
      forced = true;
      logger.error({ timeoutMs }, 'Shutdown timed out, closing open connections');
      server.closeAllConnections();
    }, timeoutMs);
    // The timer must not be what keeps the process alive.
    forceTimer.unref();

    try {
      await closeServer(server);
      await closeDatabase();
      logger.info({ forced }, 'Shutdown complete');
      exit(forced ? 1 : 0);
    } catch (error) {
      logger.error({ err: error }, 'Shutdown failed');
      exit(1);
    } finally {
      clearTimeout(forceTimer);
    }
  };
}

// The part of `process` this needs, so tests can pass a plain EventEmitter.
interface SignalEmitter {
  once(signal: NodeJS.Signals, listener: () => void): unknown;
}

// `once` on purpose: a second Ctrl+C, after the listener is gone, falls back to the default
// behavior and ends the process immediately.
export function registerShutdownSignals(
  emitter: SignalEmitter,
  shutdown: (signal: string) => Promise<void>,
): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    emitter.once(signal, () => {
      void shutdown(signal);
    });
  }
}
