// Shared by the one-off scripts: the owner is the first ADMIN_EMAILS address, who must have signed
// in at least once in this environment (Neon Auth users live in this branch's neon_auth schema).
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { parseAdminEmails } from '../src/auth';
import { createNeonDb, rowsOf, type Db } from '../src/db/client';
import { createProfilesRepo } from '../src/profiles-repo';

export function loadScriptEnv() {
  try {
    process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
  } catch {
    // No .env file: rely on the environment.
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not defined');
  return { db: createNeonDb(url), host: new URL(url).host };
}

export async function findOwner(db: Db) {
  const email = parseAdminEmails(process.env.ADMIN_EMAILS)[0];
  if (!email) throw new Error('ADMIN_EMAILS is not defined');
  const [user] = rowsOf<{ id: string; name: string; image: string | null }>(
    await db.execute(
      sql`select id::text as id, name, image from neon_auth."user" where lower(email) = ${email}`,
    ),
  );
  if (!user) {
    throw new Error(
      'The owner (first ADMIN_EMAILS address) has not signed in here yet. Sign in once, then re-run.',
    );
  }
  // The profile is normally created on the first API request; make sure it exists, as an admin.
  const profiles = createProfilesRepo(db);
  if (!(await profiles.get(user.id))) {
    await profiles.create({
      id: user.id,
      email,
      emailVerified: true,
      name: user.name,
      image: user.image,
    });
  }
  await profiles.promoteToAdmin(user.id);
  return { id: user.id };
}
