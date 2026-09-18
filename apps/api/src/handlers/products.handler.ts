import type { ListProductsQuery } from '@vynyl/shared';
import type { RequestHandler } from 'express';
import { getValidated } from '../middleware/validate';
import type { ProductsService } from '../services/products.service';

export interface ProductsHandler {
  list: RequestHandler;
}

// HTTP layer only: reads the already validated input, calls the service and writes the response.
// Failures (including rejected promises) reach the central error handler on their own in Express 5.
export function createProductsHandler(deps: { productsService: ProductsService }): ProductsHandler {
  const { productsService } = deps;

  return {
    list: async (_req, res) => {
      const query = getValidated<ListProductsQuery>(res, 'query');
      res.json(await productsService.list(query));
    },
  };
}
