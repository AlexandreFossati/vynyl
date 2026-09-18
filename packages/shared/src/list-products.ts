import { z } from 'zod';
import { DEFAULT_LIMIT, MAX_LIMIT, MAX_SEARCH_LENGTH } from './constants';
import { productSchema } from './product';
import { wholeNumber } from './whole-number';

export const listProductsQuerySchema = z.strictObject({
  limit: wholeNumber.pipe(z.int().min(1).max(MAX_LIMIT)).default(DEFAULT_LIMIT),
  offset: wholeNumber.pipe(z.int().min(0)).default(0),
  // A blank search term means "no search".
  q: z
    .string()
    .trim()
    .max(MAX_SEARCH_LENGTH)
    .transform((value) => (value === '' ? undefined : value))
    .optional(),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const productListResponseSchema = z.strictObject({
  data: z.array(productSchema),
  total: z.int().min(0),
  limit: z.int().min(1).max(MAX_LIMIT),
  offset: z.int().min(0),
});
export type ProductListResponse = z.infer<typeof productListResponseSchema>;
