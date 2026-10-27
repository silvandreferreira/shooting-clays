import type { AccountStatus } from '@shooting-clays/shared';
import { sql } from 'drizzle-orm';
import { readFile } from 'node:fs/promises';
import { Hono } from 'hono';
import { createApp } from './app';
import { createTestAuth } from './auth';
import type { Config } from './config';
import { createContactLimiter, type ContactMessage } from './contact';
import { createMemoryDb, upsertAuthUser } from './db/memory';
import { profiles } from './db/schema';
import { HISTORY_CSV_PATH, parseHistoryCsv, resetToHistory } from './import/history-csv';
import { baseDeps } from './runtime';

/** E2E: the owner is the first ADMIN_EMAILS address (an admin); the CSV history is theirs. */
export const E2E_OWNER = {
  id: 'e2e-owner',
  displayName: 'Test Owner',
  email: 'owner@example.test',
};

/**
 * E2E app: in-memory PGlite seeded from the CSV history, a local signing key instead of Neon Auth,
 * an outbox instead of Gmail, and test-only routes (`/api/__test__/reset`, `/api/__test__/token`,
 * `/api/__test__/outbox`). Never used outside E2E, and
 * never part of the Vercel bundle.
 */
export async function createE2eApp(config: Config) {
  const db = await createMemoryDb();
  const rows = parseHistoryCsv(await readFile(HISTORY_CSV_PATH, 'utf8'));
  const testAuth = await createTestAuth();
  const outbox: ContactMessage[] = [];
  const contactLimiter = createContactLimiter();
  const reset = async () => {
    outbox.length = 0;
    contactLimiter.reset();
    await db.execute(sql`truncate table neon_auth."user"`);
    await upsertAuthUser(db, {
      id: E2E_OWNER.id,
      name: E2E_OWNER.displayName,
      email: E2E_OWNER.email,
    });
    await resetToHistory(db, rows, E2E_OWNER);
  };
  await reset();

  const testRoutes = (app: Hono) => {
    app.post('/__test__/reset', async (c) => {
      await reset();
      return c.json({ ok: true });
    });
    // Contact form messages "sent" since the last reset.
    app.get('/__test__/outbox', (c) => c.json(outbox));
    // Signs in like Neon Auth (the user exists in neon_auth."user") and mints a JWT like Neon
    // Auth's, so the browser tests never use Google. `status` gives a new user that account state.
    app.post('/__test__/token', async (c) => {
      const { status, ...user } = (await c.req.json()) as {
        id: string;
        email: string;
        name: string;
        emailVerified?: boolean;
        status?: AccountStatus;
      };
      await upsertAuthUser(db, user);
      if (status) {
        await db
          .insert(profiles)
          .values({ userId: user.id, displayName: user.name, status })
          .onConflictDoNothing({ target: profiles.userId });
      }
      return c.json({ token: await testAuth.signToken(user) });
    });
  };
  return createApp({
    ...baseDeps(config, db),
    verifyToken: testAuth.verifyToken,
    sendContact: async (message) => {
      outbox.push(message);
    },
    contactLimiter,
    testRoutes,
  });
}
