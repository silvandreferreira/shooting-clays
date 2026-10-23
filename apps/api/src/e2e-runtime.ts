import { readFile } from 'node:fs/promises';
import { Hono } from 'hono';
import { createApp } from './app';
import { createTestAuth } from './auth';
import type { Config } from './config';
import { createMemoryDb } from './db/memory';
import { HISTORY_CSV_PATH, parseHistoryCsv, resetToHistory } from './import/history-csv';
import { baseDeps } from './runtime';

/** E2E: the owner is the first ADMIN_EMAILS address; the CSV history is theirs. */
export const E2E_OWNER = { id: 'e2e-owner', displayName: 'Test Owner' };

/**
 * E2E app: in-memory PGlite seeded from the CSV history, a local signing key instead of Neon Auth,
 * and test-only routes (`/api/__test__/reset`, `/api/__test__/token`). Never used outside E2E, and
 * never part of the Vercel bundle.
 */
export async function createE2eApp(config: Config) {
  const db = await createMemoryDb();
  const rows = parseHistoryCsv(await readFile(HISTORY_CSV_PATH, 'utf8'));
  const testAuth = await createTestAuth();
  await resetToHistory(db, rows, E2E_OWNER);

  const testRoutes = (app: Hono) => {
    app.post('/__test__/reset', async (c) => {
      await resetToHistory(db, rows, E2E_OWNER);
      return c.json({ ok: true });
    });
    // Mints a JWT like Neon Auth's, so the browser tests can sign in without Google.
    app.post('/__test__/token', async (c) => {
      const body = (await c.req.json()) as {
        id: string;
        email: string;
        name: string;
        emailVerified?: boolean;
      };
      return c.json({ token: await testAuth.signToken(body) });
    });
  };
  return createApp({ ...baseDeps(config, db), verifyToken: testAuth.verifyToken, testRoutes });
}
