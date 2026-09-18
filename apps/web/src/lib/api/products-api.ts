import { productListResponseSchema, type ProductListResponse } from '@vynyl/shared';
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
}

export function createProductsApi(http: HttpClient): ProductsApi {
  return {
    async list({ limit, offset, q }, signal) {
      const body = await http.request('/api/products', { query: { limit, offset, q }, signal });

      // The response crosses a trust boundary: check it against the shared contract.
      const parsed = productListResponseSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError({
          status: 200,
          code: 'INVALID_RESPONSE',
          message: 'The server response did not match the expected format',
        });
      }
      return parsed.data;
    },
  };
}

export const productsApi = createProductsApi(createHttpClient());
