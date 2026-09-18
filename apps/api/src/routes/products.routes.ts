import { listProductsQuerySchema } from '@vynyl/shared';
import { Router } from 'express';
import type { ProductsHandler } from '../handlers/products.handler';
import { validate } from '../middleware/validate';

// Mounted at /api/products. Each route declares its validation and its handler, nothing else.
export function createProductsRouter(deps: { productsHandler: ProductsHandler }): Router {
  const { productsHandler } = deps;
  const router = Router();

  router.get('/', validate({ query: listProductsQuerySchema }), productsHandler.list);

  return router;
}
