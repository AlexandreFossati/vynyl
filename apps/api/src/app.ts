import express, { type Express } from 'express';
import type { Logger } from 'pino';
import type { Db } from './db/client';
import { createHealthHandler } from './handlers/health.handler';
import { createProductsHandler } from './handlers/products.handler';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { createRateLimiter, type RateLimitSettings } from './middleware/rate-limit';
import { createRequestLogger } from './middleware/request-logger';
import { createSpaMiddleware } from './middleware/spa';
import { createHealthRepository } from './repositories/health.repository';
import { createProductsRepository } from './repositories/products.repository';
import { createHealthRouter } from './routes/health.routes';
import { createProductsRouter } from './routes/products.routes';
import { createHealthService } from './services/health.service';
import { createProductsService } from './services/products.service';

export interface AppSettings {
  rateLimit: RateLimitSettings;
  // Number of reverse proxies whose X-Forwarded-For is trusted (0 ignores the header).
  trustProxy: number;
}

export interface AppDependencies {
  db: Db;
  logger: Logger;
  settings: AppSettings;
  // Folder of the compiled SPA. When absent, only the API is served.
  spaDir?: string | undefined;
}

// Wires the layers together: repository -> service -> handler -> router. Each layer receives
// its dependencies as parameters, so tests can build the same app on an in-memory database.
export function createApp({ db, logger, settings, spaDir }: AppDependencies): Express {
  const productsRepository = createProductsRepository(db);
  const productsService = createProductsService({ productsRepository });
  const productsHandler = createProductsHandler({ productsService });

  const healthHandler = createHealthHandler({
    healthService: createHealthService({ healthRepository: createHealthRepository(db) }),
  });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', settings.trustProxy);

  app.use(createRequestLogger(logger));
  // Before the limiter on purpose: a probe must answer even while clients are being limited.
  app.use('/health', createHealthRouter({ healthHandler }));
  // Counts every request under /api, including unknown routes and invalid bodies.
  app.use('/api', createRateLimiter(settings.rateLimit));
  // JSON bodies up to the default limit (100 kb); parser errors are answered by errorHandler.
  app.use(express.json());
  app.use('/api/products', createProductsRouter({ productsHandler }));
  // After the API, so it never shadows an API route; before the 404 so it can answer instead.
  if (spaDir) {
    app.use(createSpaMiddleware({ dir: spaDir }));
  }
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
