import type { CreateProductInput, Product, UpdateProductInput } from '@vynyl/shared';
import type { products } from '../db/schema';

export type ProductRow = typeof products.$inferSelect;
export type ProductInsert = typeof products.$inferInsert;
// Columns an update may change: never the id or the creation time, always the update time.
export type ProductPatchRow = Partial<Omit<ProductInsert, 'id' | 'createdAt' | 'updatedAt'>> & {
  updatedAt: string;
};

const toCents = (price: number): number => Math.round(price * 100);

// The database stores money as integer cents; the API exposes a decimal price.
export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    price: row.priceCents / 100,
    stock: row.stock,
    brand: row.brand,
    sku: row.sku,
    weight: row.weight,
    meta: { createdAt: row.createdAt, updatedAt: row.updatedAt },
  };
}

// Math.round makes the conversion exact: the price was already validated to have at most two
// decimals, and e.g. 19.99 * 100 is 1998.9999999999998 in floating point.
export function toProductInsert(product: Product): ProductInsert {
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    category: product.category,
    priceCents: toCents(product.price),
    stock: product.stock,
    brand: product.brand,
    sku: product.sku,
    weight: product.weight,
    createdAt: product.meta.createdAt,
    updatedAt: product.meta.updatedAt,
  };
}

// `now` is an ISO 8601 UTC string chosen by the caller (the service owns the clock).
export function toProductCreate(input: CreateProductInput, now: string): ProductInsert {
  return {
    title: input.title,
    description: input.description,
    category: input.category,
    priceCents: toCents(input.price),
    stock: input.stock,
    brand: input.brand,
    sku: input.sku,
    weight: input.weight,
    createdAt: now,
    updatedAt: now,
  };
}

// Only the fields present in the patch are written; createdAt is never touched.
export function toProductPatch(patch: UpdateProductInput, now: string): ProductPatchRow {
  const { price, ...fields } = patch;
  return {
    ...fields,
    ...(price === undefined ? {} : { priceCents: toCents(price) }),
    updatedAt: now,
  };
}
