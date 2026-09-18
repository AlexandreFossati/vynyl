import type {
  CreateProductInput,
  ListProductsQuery,
  ProductIdParams,
  UpdateProductInput,
} from '@vynyl/shared';
import type { RequestHandler } from 'express';
import { getValidated } from '../middleware/validate';
import type { ProductsService } from '../services/products.service';

export interface ProductsHandler {
  list: RequestHandler;
  get: RequestHandler;
  create: RequestHandler;
  update: RequestHandler;
  remove: RequestHandler;
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

    get: async (_req, res) => {
      const { id } = getValidated<ProductIdParams>(res, 'params');
      res.json(await productsService.get(id));
    },

    create: async (req, res) => {
      const input = getValidated<CreateProductInput>(res, 'body');
      const product = await productsService.create(input);
      res.status(201).location(`${req.baseUrl}/${product.id}`).json(product);
    },

    update: async (_req, res) => {
      const { id } = getValidated<ProductIdParams>(res, 'params');
      const patch = getValidated<UpdateProductInput>(res, 'body');
      res.json(await productsService.update(id, patch));
    },

    remove: async (_req, res) => {
      const { id } = getValidated<ProductIdParams>(res, 'params');
      await productsService.remove(id);
      res.status(204).end();
    },
  };
}
