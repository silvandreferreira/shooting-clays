export const LOCAL_USER_ID = 'local';

export interface Config {
  databaseUrl: string | undefined;
  e2e: boolean;
  /** Fixed clock for E2E (APP_NOW); ignored in production. */
  appNow: string | undefined;
  env: string;
  release: string | undefined;
  logsSourceToken: string | undefined;
  logsIngestUrl: string;
  sentryDsn: string | undefined;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const isProduction = env.VERCEL_ENV === 'production';
  return {
    databaseUrl: env.DATABASE_URL || undefined,
    e2e: !isProduction && env.E2E === '1',
    appNow: isProduction ? undefined : env.APP_NOW || undefined,
    env: env.VERCEL_ENV ?? (env.E2E === '1' ? 'e2e' : 'development'),
    release: env.VERCEL_GIT_COMMIT_SHA,
    logsSourceToken: env.LOGS_SOURCE_TOKEN || undefined,
    logsIngestUrl: env.LOGS_INGEST_URL || 'https://in.logs.betterstack.com',
    sentryDsn: env.SENTRY_DSN || undefined,
  };
}

/** Clock for the app: noon UTC on APP_NOW (a YYYY-MM-DD date) if set, otherwise real time. */
export function createClock(appNow: string | undefined): () => Date {
  if (!appNow) return () => new Date();
  const fixed = new Date(`${appNow}T12:00:00Z`);
  if (Number.isNaN(fixed.getTime())) throw new Error(`APP_NOW is not a valid date: ${appNow}`);
  return () => fixed;
}
