import express, { type Express } from 'express';
import type { Logger } from 'pino';
import type { Db } from './db/client';
import { createProductsHandler } from './handlers/products.handler';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { createRequestLogger } from './middleware/request-logger';
import { createProductsRepository } from './repositories/products.repository';
import { createProductsRouter } from './routes/products.routes';
import { createProductsService } from './services/products.service';

export interface AppDependencies {
  db: Db;
  logger: Logger;
}

// Wires the layers together: repository -> service -> handler -> router. Each layer receives
// its dependencies as parameters, so tests can build the same app on an in-memory database.
export function createApp({ db, logger }: AppDependencies): Express {
  const productsRepository = createProductsRepository(db);
  const productsService = createProductsService({ productsRepository });
  const productsHandler = createProductsHandler({ productsService });

  const app = express();
  app.disable('x-powered-by');

  app.use(createRequestLogger(logger));
  app.use('/api/products', createProductsRouter({ productsHandler }));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
