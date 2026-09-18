import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ISO 8601 UTC with milliseconds and a trailing "Z", e.g. 2025-04-30T09:41:02.053Z.
const isoTimestampNow = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`;

// The database is the last line of defence: the constraints below hold even if the
// validation layer is bypassed. The API exposes price as a decimal, stored here as cents.
export const products = sqliteTable(
  'products',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    category: text('category').notNull(),
    priceCents: integer('price_cents').notNull(),
    stock: integer('stock').notNull(),
    brand: text('brand').notNull(),
    sku: text('sku').notNull().unique(),
    weight: real('weight').notNull(),
    createdAt: text('created_at').notNull().default(isoTimestampNow),
    updatedAt: text('updated_at').notNull().default(isoTimestampNow),
  },
  (table) => [
    index('products_category_idx').on(table.category),
    check('products_price_cents_non_negative', sql`${table.priceCents} >= 0`),
    check('products_stock_non_negative', sql`${table.stock} >= 0`),
    check('products_weight_positive', sql`${table.weight} > 0`),
  ],
);
