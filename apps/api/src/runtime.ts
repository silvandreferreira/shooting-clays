import * as Sentry from '@sentry/node';
import { readFile } from 'node:fs/promises';
import { createApp, type AppDeps } from './app';
import { createClock, type Config } from './config';
import { createMemoryDb, createNeonDb, type Db } from './db/client';
import { parseHistoryCsv, resetToHistory } from './import/history-csv';
import { createLogger } from './logger';

export const HISTORY_CSV_PATH = new URL('../../../data/clays-results.csv', import.meta.url);

function baseDeps(config: Config, db: Db): AppDeps {
  if (config.sentryDsn) {
    Sentry.init({ dsn: config.sentryDsn, environment: config.env, release: config.release });
  }
  return {
    db,
    now: createClock(config.appNow),
    logger: createLogger(config),
    captureException: config.sentryDsn ? (e) => Sentry.captureException(e) : undefined,
  };
}

/** Production / development app backed by Neon. */
export function createNeonApp(config: Config) {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is not defined');
  return createApp(baseDeps(config, createNeonDb(config.databaseUrl)));
}

/** E2E app: in-memory PGlite seeded from the CSV history, with the test-only reset endpoint. */
export async function createE2eApp(config: Config) {
  const db = await createMemoryDb();
  const rows = parseHistoryCsv(await readFile(HISTORY_CSV_PATH, 'utf8'));
  const resetForTests = async () => {
    await resetToHistory(db, rows);
  };
  await resetForTests();
  return createApp({ ...baseDeps(config, db), resetForTests });
}
