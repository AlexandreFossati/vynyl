import { EventEmitter } from 'node:events';
import { createServer, request, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createTestDatabase } from '../test/database';
import { createLogCapture } from '../test/log-capture';
import { createShutdown, registerShutdownSignals } from './shutdown';

const TIMEOUT_MS = 5000;

// A promise the test settles by hand.
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
};

const listen = (server: Server) =>
  new Promise<number>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port));
  });

// A client that never reuses connections, so what it sees is what the server did.
const send = (port: number) =>
  new Promise<{ status: number | undefined; body: string }>((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port, agent: false }, (res: IncomingMessage) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk: string) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });

async function setup() {
  const events: string[] = [];
  const gate = deferred();
  let requestsSeen = 0;

  // Answers only once the test opens the gate, so a request can stay in flight on demand.
  const server = createServer((_req, res) => {
    requestsSeen += 1;
    void gate.promise.then(() => {
      res.on('finish', () => events.push('response sent'));
      res.end('done');
    });
  });
  const port = await listen(server);
  const database = await createTestDatabase();
  const capture = createLogCapture();
  const exit = vi.fn<(code: number) => void>((code) => {
    events.push(`exit ${code}`);
  });
  const closeDatabase = vi.fn(() => {
    events.push('database closed');
    database.close();
  });

  const shutdown = createShutdown({
    server,
    closeDatabase,
    logger: capture.logger,
    timeoutMs: TIMEOUT_MS,
    exit,
  });

  return {
    server,
    port,
    gate,
    events,
    capture,
    exit,
    closeDatabase,
    shutdown,
    requestsSeen: () => requestsSeen,
  };
}

describe('createShutdown', () => {
  const servers: Server[] = [];

  afterEach(() => {
    vi.useRealTimers();
    for (const server of servers.splice(0)) {
      server.closeAllConnections();
      server.close();
    }
  });

  const build = async () => {
    const context = await setup();
    servers.push(context.server);
    return context;
  };

  it('lets an in-flight request finish before closing the database and exiting with 0', async () => {
    const context = await build();
    const inFlight = send(context.port);
    await vi.waitFor(() => expect(context.requestsSeen()).toBe(1));

    const shutdown = context.shutdown('SIGTERM');
    // Nothing is closed while the request is still being served.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(context.closeDatabase).not.toHaveBeenCalled();

    context.gate.resolve();
    await shutdown;

    await expect(inFlight).resolves.toEqual({ status: 200, body: 'done' });
    expect(context.events).toEqual(['response sent', 'database closed', 'exit 0']);
  });

  it('refuses new connections once shutdown has started', async () => {
    const context = await build();
    const inFlight = send(context.port);
    await vi.waitFor(() => expect(context.requestsSeen()).toBe(1));

    const shutdown = context.shutdown('SIGTERM');

    await expect(send(context.port)).rejects.toMatchObject({ code: 'ECONNREFUSED' });

    context.gate.resolve();
    await inFlight;
    await shutdown;
  });

  it('exits promptly with 0 when the server is idle', async () => {
    const context = await build();

    await context.shutdown('SIGINT');

    expect(context.closeDatabase).toHaveBeenCalledTimes(1);
    expect(context.exit).toHaveBeenCalledExactlyOnceWith(0);
    expect(context.capture.entries().map((entry) => entry.msg)).toEqual([
      'Shutdown started',
      'Shutdown complete',
    ]);
  });

  it('cuts the connections of a request that never finishes and exits with 1', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const context = await build();
    const stuck = send(context.port).catch((error: unknown) => error);
    await vi.waitFor(() => expect(context.requestsSeen()).toBe(1));

    const shutdown = context.shutdown('SIGTERM');
    await vi.advanceTimersByTimeAsync(TIMEOUT_MS);
    await shutdown;

    expect(await stuck).toBeInstanceOf(Error);
    expect(context.closeDatabase).toHaveBeenCalledTimes(1);
    expect(context.exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(context.capture.entries().map((entry) => entry.msg)).toContain(
      'Shutdown timed out, closing open connections',
    );
  });

  it('ignores a second call while shutting down', async () => {
    const context = await build();

    await Promise.all([context.shutdown('SIGINT'), context.shutdown('SIGTERM')]);
    await context.shutdown('SIGTERM');

    expect(context.exit).toHaveBeenCalledTimes(1);
    expect(context.closeDatabase).toHaveBeenCalledTimes(1);
    const started = context.capture.entries().filter((entry) => entry.msg === 'Shutdown started');
    expect(started).toHaveLength(1);
  });

  it('logs the failure and exits with 1 when the database cannot be closed', async () => {
    const context = await build();
    const failing = createShutdown({
      server: context.server,
      closeDatabase: () => {
        throw new Error('cannot close');
      },
      logger: context.capture.logger,
      timeoutMs: TIMEOUT_MS,
      exit: context.exit,
    });

    await failing('SIGTERM');

    expect(context.exit).toHaveBeenCalledExactlyOnceWith(1);
    const failure = context.capture.entries().find((entry) => entry.msg === 'Shutdown failed');
    expect(failure?.err?.message).toBe('cannot close');
  });
});

describe('registerShutdownSignals', () => {
  it('runs the shutdown for SIGINT and for SIGTERM, once per signal', () => {
    const emitter = new EventEmitter();
    const shutdown = vi.fn().mockResolvedValue(undefined);
    registerShutdownSignals(emitter, shutdown);

    emitter.emit('SIGINT');
    emitter.emit('SIGINT');
    emitter.emit('SIGTERM');

    expect(shutdown.mock.calls).toEqual([['SIGINT'], ['SIGTERM']]);
  });
});
