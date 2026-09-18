import type {
  CreateProductInput,
  ListProductsQuery,
  Product,
  ProductListResponse,
  UpdateProductInput,
} from '@vynyl/shared';
import { AppError } from '../lib/errors';
import { toProduct, toProductCreate, toProductPatch } from '../mappers/product.mapper';
import { DuplicateSkuError, type ProductsRepository } from '../repositories/products.repository';

export interface ProductsService {
  list(query: ListProductsQuery): Promise<ProductListResponse>;
  get(id: number): Promise<Product>;
  create(input: CreateProductInput): Promise<Product>;
  update(id: number, patch: UpdateProductInput): Promise<Product>;
  remove(id: number): Promise<void>;
}

const productNotFound = (id: number): AppError =>
  new AppError('PRODUCT_NOT_FOUND', `Product ${id} not found`);

// Turns the repository's domain error into the error the API reports.
async function reportSkuConflict<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DuplicateSkuError) {
      throw new AppError('SKU_CONFLICT', 'A product with this SKU already exists', {
        cause: error,
      });
    }
    throw error;
  }
}

export function createProductsService(deps: {
  productsRepository: ProductsRepository;
  // The clock is injected so timestamps are deterministic in tests.
  now?: () => Date;
}): ProductsService {
  const { productsRepository, now = () => new Date() } = deps;

  return {
    // Reads depend only on their input, so they can later be wrapped (e.g. by a singleflight)
    // without changing the signature.
    async list({ limit, offset, q }) {
      const { rows, total } = await productsRepository.list({ limit, offset, search: q });

      return { data: rows.map(toProduct), total, limit, offset };
    },

    async get(id) {
      const row = await productsRepository.findById(id);
      if (!row) {
        throw productNotFound(id);
      }
      return toProduct(row);
    },

    async create(input) {
      const row = await reportSkuConflict(() =>
        productsRepository.create(toProductCreate(input, now().toISOString())),
      );
      return toProduct(row);
    },

    async update(id, patch) {
      const row = await reportSkuConflict(() =>
        productsRepository.update(id, toProductPatch(patch, now().toISOString())),
      );
      if (!row) {
        throw productNotFound(id);
      }
      return toProduct(row);
    },

    async remove(id) {
      const removed = await productsRepository.remove(id);
      if (!removed) {
        throw productNotFound(id);
      }
    },
  };
}
