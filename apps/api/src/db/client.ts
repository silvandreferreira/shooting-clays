import { neon } from '@neondatabase/serverless';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { fileURLToPath } from 'node:url';
import * as schema from './schema';

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

export function createNeonDb(databaseUrl: string): Db {
  return drizzleNeon({ client: neon(databaseUrl), schema });
}

/** Rows of a raw `db.execute(sql…)`: both drivers (Neon HTTP, PGlite) return `{ rows }`. */
export function rowsOf<T>(result: unknown): T[] {
  return (result as { rows: T[] }).rows;
}
