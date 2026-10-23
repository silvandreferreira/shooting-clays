import * as Sentry from '@sentry/node';
import { readFile } from 'node:fs/promises';
import { Hono } from 'hono';
import { createApp, type AppDeps } from './app';
import { createNeonAuthVerifier, createTestAuth } from './auth';
import { createClock, type Config } from './config';
import { createMemoryDb, createNeonDb, type Db } from './db/client';
import { parseHistoryCsv, resetToHistory } from './import/history-csv';
import { createLogger } from './logger';

export const HISTORY_CSV_PATH = new URL('../../../data/clays-results.csv', import.meta.url);

function baseDeps(config: Config, db: Db): Omit<AppDeps, 'verifyToken'> {
  if (config.sentryDsn) {
    Sentry.init({ dsn: config.sentryDsn, environment: config.env, release: config.release });
  }
  return {
    db,
    now: createClock(config.appNow),
    adminEmails: config.adminEmails,
    logger: createLogger(config),
    captureException: config.sentryDsn ? (e) => Sentry.captureException(e) : undefined,
  };
}

/** Production / development app backed by Neon. */
export function createNeonApp(config: Config) {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is not defined');
  if (!config.neonAuthUrl) throw new Error('NEON_AUTH_URL is not defined');
  return createApp({
    ...baseDeps(config, createNeonDb(config.databaseUrl)),
    verifyToken: createNeonAuthVerifier(config.neonAuthUrl),
  });
}

/** E2E: the owner is the first ADMIN_EMAILS address; the CSV history is theirs. */
export const E2E_OWNER = { id: 'e2e-owner', displayName: 'Test Owner' };

/**
 * E2E app: in-memory PGlite seeded from the CSV history, a local signing key instead of Neon Auth,
 * and test-only routes (`/api/__test__/reset`, `/api/__test__/token`). Never used outside E2E.
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
