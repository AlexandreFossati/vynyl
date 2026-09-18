import type {
  CreateProductInput,
  ListProductsQuery,
  Product,
  ProductListResponse,
  UpdateProductInput,
} from '@vynyl/shared';
import { AppError } from '../lib/errors';
import { createSingleflight, type Singleflight } from '../lib/singleflight';
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
  // One instance per service: simultaneous identical reads share a single repository call.
  singleflight?: Singleflight;
}): ProductsService {
  const { productsRepository, now = () => new Date(), singleflight = createSingleflight() } = deps;

  return {
    // Only reads are coalesced; writes always reach the repository. The search term goes last in
    // the key so it cannot be confused with the numeric parts.
    list({ limit, offset, q }) {
      return singleflight.do(`list:${limit}:${offset}:${q ?? ''}`, async () => {
        const { rows, total } = await productsRepository.list({ limit, offset, search: q });

        return { data: rows.map(toProduct), total, limit, offset };
      });
    },

    get(id) {
      return singleflight.do(`get:${id}`, async () => {
        const row = await productsRepository.findById(id);
        if (!row) {
          throw productNotFound(id);
        }
        return toProduct(row);
      });
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
