import { z } from 'zod';
import { productSchema } from './product';
import { wholeNumber } from './whole-number';

// Input schemas are derived from the product contract, so field rules live in one place.
// id and meta are managed by the server and are rejected (with any unknown key) as input.
export const createProductInputSchema = productSchema.omit({ id: true, meta: true });
export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = createProductInputSchema
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, 'at least one field is required');
export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

export const productIdParamsSchema = z.strictObject({
  id: wholeNumber.pipe(z.int().min(1)),
});
export type ProductIdParams = z.infer<typeof productIdParamsSchema>;
