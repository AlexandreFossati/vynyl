import {
  createProductInputSchema,
  listProductsQuerySchema,
  productIdParamsSchema,
  updateProductInputSchema,
} from '@vynyl/shared';
import { Router } from 'express';
import type { ProductsHandler } from '../handlers/products.handler';
import { validate } from '../middleware/validate';

// Mounted at /api/products. Each route declares its validation and its handler, nothing else.
export function createProductsRouter(deps: { productsHandler: ProductsHandler }): Router {
  const { productsHandler } = deps;
  const router = Router();

  router.get('/', validate({ query: listProductsQuerySchema }), productsHandler.list);
  router.post('/', validate({ body: createProductInputSchema }), productsHandler.create);
  router.get('/:id', validate({ params: productIdParamsSchema }), productsHandler.get);
  router.patch(
    '/:id',
    validate({ params: productIdParamsSchema, body: updateProductInputSchema }),
    productsHandler.update,
  );
  router.delete('/:id', validate({ params: productIdParamsSchema }), productsHandler.remove);

  return router;
}
