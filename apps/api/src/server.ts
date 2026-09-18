import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createApp } from './app';
import { ConfigError, loadConfig, type Config } from './config/env';
import { getPaths } from './config/paths';
import { createDatabase } from './db/client';
import { runMigrations } from './db/migrate';
import { seedProducts } from './db/seed';
import { createLogger } from './lib/logger';
import { createShutdown, registerShutdownSignals } from './lib/shutdown';

// Composition root: the only place that reads the environment and creates real resources.
const paths = getPaths(import.meta.url);

// How long in-flight requests get to finish after SIGINT/SIGTERM before they are cut.
const SHUTDOWN_TIMEOUT_MS = 10_000;

// The .env file is optional and never overrides variables already set in the environment.
function loadOptionalEnvFile(file: string): void {
  try {
    process.loadEnvFile(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

// Refuses to start on an invalid configuration, before opening the database or listening.
// The logger does not exist yet at this point, so the message goes straight to stderr.
function readConfig(): Config {
  try {
    return loadConfig(process.env);
  } catch (error) {
    if (error instanceof ConfigError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  loadOptionalEnvFile(paths.envFile);
  const config = readConfig();
  const logger = createLogger({ level: config.LOG_LEVEL });

  try {
    const { client, db } = await createDatabase({
      databasePath: config.DATABASE_PATH,
      repoRoot: paths.repoRoot,
    });
    await runMigrations(db, paths.migrationsDir);
    await seedProducts(db, { file: paths.datasetFile, logger });

    // The SPA is served only when it has been built (npm start builds it; npm run dev serves it
    // with Vite instead).
    const spaBuilt = existsSync(join(paths.webDistDir, 'index.html'));
    if (!spaBuilt) {
      logger.warn({ dir: paths.webDistDir }, 'SPA build not found; serving the API only');
    }

    const app = createApp({
      db,
      logger,
      spaDir: spaBuilt ? paths.webDistDir : undefined,
      settings: {
        rateLimit: { limit: config.RATE_LIMIT_MAX, windowMs: config.RATE_LIMIT_WINDOW_MS },
        trustProxy: config.TRUST_PROXY,
      },
    });
    const server = app.listen(config.PORT, () => {
      logger.info({ port: config.PORT, env: config.NODE_ENV }, 'API listening');
    });
    server.once('error', (error) => {
      logger.fatal({ err: error }, 'HTTP server error');
      process.exit(1);
    });

    registerShutdownSignals(
      process,
      createShutdown({
        server,
        closeDatabase: () => client.close(),
        logger,
        timeoutMs: SHUTDOWN_TIMEOUT_MS,
        exit: (code) => process.exit(code),
      }),
    );
  } catch (error) {
    logger.fatal({ err: error }, 'Startup failed');
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exit(1);
});
