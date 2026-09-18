import { migrate } from 'drizzle-orm/libsql/migrator';
import type { Db } from './client';

// Applies every pending migration of the versioned folder; already applied ones are skipped.
export async function runMigrations(db: Db, migrationsDir: string): Promise<void> {
  await migrate(db, { migrationsFolder: migrationsDir });
}
