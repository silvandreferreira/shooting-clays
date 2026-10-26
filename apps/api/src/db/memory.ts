// Kept apart from client.ts so the production bundle never includes PGlite.
import { PGlite } from '@electric-sql/pglite';
import { sql } from 'drizzle-orm';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { MIGRATIONS_FOLDER, type Db } from './client';
import * as schema from './schema';

/**
 * In-memory Postgres with all migrations applied, plus a stand-in for Neon Auth's user table
 * (`neon_auth."user"`, the columns the API reads). Used by tests and E2E mode, so the admin queries
 * and the account removal run the same SQL as on Neon. Ids are text here (uuid on Neon).
 */
export async function createMemoryDb(): Promise<Db> {
  const db = drizzlePglite({ client: new PGlite(), schema });
  await migratePglite(db, { migrationsFolder: MIGRATIONS_FOLDER });
  await db.execute(sql`create schema neon_auth`);
  await db.execute(sql`
    create table neon_auth."user" (
      id text primary key,
      name text not null,
      email text not null,
      "emailVerified" boolean not null default true,
      image text,
      "createdAt" timestamptz not null default now(),
      "updatedAt" timestamptz not null default now()
    )`);
  return db;
}

/** Tests and E2E only: what Neon Auth stores when someone signs in with Google. */
export async function upsertAuthUser(
  db: Db,
  user: { id: string; email: string; name: string; image?: string | null; createdAt?: Date },
) {
  await db.execute(sql`
    insert into neon_auth."user" (id, name, email, image, "createdAt")
    values (${user.id}, ${user.name}, ${user.email}, ${user.image ?? null},
      ${(user.createdAt ?? new Date()).toISOString()})
    on conflict (id) do update set name = excluded.name, email = excluded.email,
      image = excluded.image`);
}
