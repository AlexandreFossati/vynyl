import type { Product } from '@vynyl/shared';
import type { products } from '../db/schema';

export type ProductRow = typeof products.$inferSelect;
export type ProductInsert = typeof products.$inferInsert;

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
    priceCents: Math.round(product.price * 100),
    stock: product.stock,
    brand: product.brand,
    sku: product.sku,
    weight: product.weight,
    createdAt: product.meta.createdAt,
    updatedAt: product.meta.updatedAt,
  };
}
