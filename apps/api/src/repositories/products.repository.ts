import { asc, count, eq, or, sql, type SQL } from 'drizzle-orm';
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core';
import type { Db } from '../db/client';
import { products } from '../db/schema';
import { escapeLikePattern } from '../lib/like';
import type { ProductInsert, ProductPatchRow, ProductRow } from '../mappers/product.mapper';

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
  findById(id: number): Promise<ProductRow | undefined>;
  create(row: ProductInsert): Promise<ProductRow>;
  update(id: number, patch: ProductPatchRow): Promise<ProductRow | undefined>;
  remove(id: number): Promise<boolean>;
}

// Domain error (no HTTP knowledge): the service decides how it is reported.
export class DuplicateSkuError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('A product with this SKU already exists', options);
    this.name = 'DuplicateSkuError';
  }
}

// Drizzle wraps the driver error in a generic Error whose `cause` is the LibsqlError.
const isSkuViolation = (error: unknown): boolean => {
  const candidates = error instanceof Error ? [error, error.cause] : [];
  return candidates.some(
    (candidate) =>
      candidate instanceof Error &&
      (candidate as { code?: string }).code === 'SQLITE_CONSTRAINT' &&
      candidate.message.includes('UNIQUE constraint failed: products.sku'),
  );
};

// Uniqueness is enforced by the database constraint (no check-then-write), so concurrent
// requests cannot create duplicates; any other error is rethrown untouched.
async function translateSkuViolation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isSkuViolation(error)) {
      throw new DuplicateSkuError({ cause: error });
    }
    throw error;
  }
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

    async findById(id) {
      const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
      return row;
    },

    create(row) {
      return translateSkuViolation(async () => {
        const [created] = await db.insert(products).values(row).returning();
        if (!created) {
          throw new Error('Insert returned no row');
        }
        return created;
      });
    },

    update(id, patch) {
      return translateSkuViolation(async () => {
        const [updated] = await db
          .update(products)
          .set(patch)
          .where(eq(products.id, id))
          .returning();
        return updated;
      });
    },

    async remove(id) {
      const deleted = await db
        .delete(products)
        .where(eq(products.id, id))
        .returning({ id: products.id });
      return deleted.length > 0;
    },
  };
}
