import type { ListProductsQuery, ProductListResponse } from '@vynyl/shared';
import { toProduct } from '../mappers/product.mapper';
import type { ProductsRepository } from '../repositories/products.repository';

export interface ProductsService {
  list(query: ListProductsQuery): Promise<ProductListResponse>;
}

export function createProductsService(deps: {
  productsRepository: ProductsRepository;
}): ProductsService {
  const { productsRepository } = deps;

  return {
    // Depends only on its input, so it can later be wrapped (e.g. by a singleflight) without
    // changing the signature.
    async list({ limit, offset, q }) {
      const { rows, total } = await productsRepository.list({ limit, offset, search: q });

      return { data: rows.map(toProduct), total, limit, offset };
    },
  };
}
