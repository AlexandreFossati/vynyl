import { sql } from 'drizzle-orm';
import type { Db } from '../db/client';

export interface HealthRepository {
  // Resolves when the database answers; rejects when it does not.
  ping(): Promise<void>;
}

export function createHealthRepository(db: Db): HealthRepository {
  return {
    async ping() {
      await db.run(sql`select 1`);
    },
  };
}
