import { z } from 'zod';

// Field rules of the product contract. The same schema types the API response and validates
// the seed dataset; input schemas for create/update are derived from it with omit/partial.
export const productSchema = z.strictObject({
  id: z.int().positive(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(2000),
  category: z
    .string()
    .trim()
    .min(1)
    .max(50)
    .refine((value) => value === value.toLowerCase(), 'must be lowercase'),
  price: z.number().min(0).multipleOf(0.01),
  stock: z.int().min(0),
  brand: z.string().trim().min(1).max(100),
  sku: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9-]+$/, 'must contain only uppercase letters, digits and hyphens'),
  weight: z.number().positive(),
  meta: z.strictObject({
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
  }),
});
export type Product = z.infer<typeof productSchema>;
