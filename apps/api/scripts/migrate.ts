// Applies the migrations in apps/api/drizzle to the database in DATABASE_URL.
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { fileURLToPath } from 'node:url';
import { MIGRATIONS_FOLDER } from '../src/db/client';

try {
  process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
} catch {
  // No .env file: rely on the environment.
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not defined');

await migrate(drizzle({ client: neon(url) }), { migrationsFolder: MIGRATIONS_FOLDER });
console.log(`Migrations applied (${new URL(url).host})`);
