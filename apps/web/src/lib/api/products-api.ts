import {
  productListResponseSchema,
  productSchema,
  type CreateProductInput,
  type Product,
  type ProductListResponse,
  type UpdateProductInput,
} from '@vynyl/shared';
import { ApiError } from './api-error';
import { createHttpClient, type HttpClient } from './http-client';

export interface ListProductsParams {
  limit?: number;
  offset?: number;
  q?: string | undefined;
}

// What the pages depend on: they receive it as a prop, so tests can hand them a fake.
export interface ProductsApi {
  list(params: ListProductsParams, signal?: AbortSignal): Promise<ProductListResponse>;
  get(id: number, signal?: AbortSignal): Promise<Product>;
  create(input: CreateProductInput, signal?: AbortSignal): Promise<Product>;
  update(id: number, input: UpdateProductInput, signal?: AbortSignal): Promise<Product>;
  remove(id: number, signal?: AbortSignal): Promise<void>;
}

// The part of a Zod schema this module uses (zod itself is a dependency of shared only).
interface Schema<T> {
  safeParse(data: unknown): { success: true; data: T } | { success: false };
}

// A response crosses a trust boundary: check it against the shared contract.
function parse<T>(schema: Schema<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError({
      status: 200,
      code: 'INVALID_RESPONSE',
      message: 'The server response did not match the expected format',
    });
  }
  return parsed.data;
}

export function createProductsApi(http: HttpClient): ProductsApi {
  const productPath = (id: number) => `/api/products/${id}`;

  return {
    async list({ limit, offset, q }, signal) {
      const body = await http.request('/api/products', { query: { limit, offset, q }, signal });
      return parse(productListResponseSchema, body);
    },

    async get(id, signal) {
      return parse(productSchema, await http.request(productPath(id), { signal }));
    },

    async create(input, signal) {
      const body = await http.request('/api/products', { method: 'POST', body: input, signal });
      return parse(productSchema, body);
    },

    async update(id, input, signal) {
      const body = await http.request(productPath(id), { method: 'PATCH', body: input, signal });
      return parse(productSchema, body);
    },

    async remove(id, signal) {
      await http.request(productPath(id), { method: 'DELETE', signal });
    },
  };
}

export const productsApi = createProductsApi(createHttpClient());
