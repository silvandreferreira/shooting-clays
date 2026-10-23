// Kept apart from client.ts so the production bundle never includes PGlite.
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { MIGRATIONS_FOLDER, type Db } from './client';
import * as schema from './schema';

/** In-memory Postgres with all migrations applied. Used by tests and E2E mode. */
export async function createMemoryDb(): Promise<Db> {
  const db = drizzlePglite({ client: new PGlite(), schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
