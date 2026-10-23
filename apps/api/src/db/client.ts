import { PGlite } from '@electric-sql/pglite';
import { neon } from '@neondatabase/serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

export function createNeonDb(databaseUrl: string): Db {
  return drizzleNeon({ client: neon(databaseUrl), schema });
}

/** In-memory Postgres with all migrations applied. Used by tests and E2E mode. */
export async function createMemoryDb(): Promise<Db> {
  const db = drizzlePglite({ client: new PGlite(), schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
