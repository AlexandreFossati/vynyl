import { asc, count, or, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { Db } from '../db/client';
import { products } from '../db/schema';
import { escapeLikePattern } from '../lib/like';
import type { ProductRow } from '../mappers/product.mapper';

export interface ListProductsParams {
  limit: number;
  offset: number;
  search?: string | undefined;
}

export interface ProductsPage {
  rows: ProductRow[];
  total: number;
}

export interface ProductsRepository {
  list(params: ListProductsParams): Promise<ProductsPage>;
}

// Case-insensitive for ASCII letters (SQLite LIKE). The user text is always bound as a
// parameter and its wildcards are escaped, so it is never interpreted as a pattern.
const containsText = (column: SQLiteColumn, pattern: string): SQL =>
  sql`${column} LIKE ${pattern} ESCAPE '\\'`;

function searchCondition(search: string | undefined): SQL | undefined {
  if (!search) {
    return undefined;
  }
  const pattern = `%${escapeLikePattern(search)}%`;
  return or(containsText(products.title, pattern), containsText(products.description, pattern));
}

export function createProductsRepository(db: Db): ProductsRepository {
  return {
    async list({ limit, offset, search }) {
      const where = searchCondition(search);

      const rows = await db
        .select()
        .from(products)
        .where(where)
        .orderBy(asc(products.id))
        .limit(limit)
        .offset(offset);
      const [totals] = await db.select({ total: count() }).from(products).where(where);

      return { rows, total: totals?.total ?? 0 };
    },
  };
}
