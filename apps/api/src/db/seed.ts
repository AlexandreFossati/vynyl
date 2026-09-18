import { readFile } from 'node:fs/promises';
import { productSchema } from '@vynyl/shared';
import { count } from 'drizzle-orm';
import type { Logger } from 'pino';
import { z } from 'zod';
import { toProductInsert } from '../mappers/product.mapper';
import type { Db } from './client';
import { products } from './schema';

const datasetSchema = z
  .array(productSchema)
  .min(1, 'the dataset must contain at least one product');

const MAX_REPORTED_ISSUES = 5;

export class SeedError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'SeedError';
  }
}

export interface SeedResult {
  inserted: number;
  skipped: boolean;
}

const formatPath = (path: PropertyKey[]): string =>
  path
    .map((segment) => (typeof segment === 'number' ? `[${segment}]` : `.${String(segment)}`))
    .join('');

async function readDataset(file: string): Promise<unknown> {
  let content: string;
  try {
    content = await readFile(file, 'utf8');
  } catch (error) {
    throw new SeedError(`Cannot read the seed dataset ${file}`, { cause: error });
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new SeedError(`The seed dataset ${file} is not valid JSON`, { cause: error });
  }
}

// Seeds the catalog only when the products table is empty, so restarts never duplicate data.
// The whole dataset is validated first and inserted in one transaction: either every product is
// stored or none is.
export async function seedProducts(
  db: Db,
  options: { file: string; logger: Logger },
): Promise<SeedResult> {
  const { file, logger } = options;

  const [existing] = await db.select({ total: count() }).from(products);
  if ((existing?.total ?? 0) > 0) {
    logger.info('Catalog already populated, seed skipped');
    return { inserted: 0, skipped: true };
  }

  const parsed = datasetSchema.safeParse(await readDataset(file));
  if (!parsed.success) {
    const problems = parsed.error.issues
      .slice(0, MAX_REPORTED_ISSUES)
      .map((issue) => `products${formatPath(issue.path)}: ${issue.message}`);
    throw new SeedError(`The seed dataset ${file} is invalid:\n  - ${problems.join('\n  - ')}`);
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(products).values(parsed.data.map(toProductInsert));
    });
  } catch (error) {
    throw new SeedError(
      `Failed to insert the seed dataset ${file}; nothing was inserted (${
        error instanceof Error ? error.message : String(error)
      })`,
      { cause: error },
    );
  }

  logger.info({ inserted: parsed.data.length }, 'Catalog seeded');
  return { inserted: parsed.data.length, skipped: false };
}
