import * as Sentry from '@sentry/node';
import { Hono } from 'hono';
import { createApp, type AppDeps } from './app';
import { createAuthProxy } from './auth-proxy';
import { createNeonAuthVerifier } from './auth';
import { createClock, type Config } from './config';
import { createSmtpSender } from './contact';
import { createNeonDb, type Db } from './db/client';
import { createLogger } from './logger';

export function baseDeps(config: Config, db: Db): Omit<AppDeps, 'verifyToken'> {
  if (config.sentryDsn) {
    Sentry.init({ dsn: config.sentryDsn, environment: config.env, release: config.release });
  }
  return {
    db,
    now: createClock(config.appNow),
    adminEmails: config.adminEmails,
    logger: createLogger(config),
    captureException: config.sentryDsn ? (e) => Sentry.captureException(e) : undefined,
    sendContact:
      config.smtpUser && config.smtpPassword && config.contactToEmail
        ? createSmtpSender({
            user: config.smtpUser,
            password: config.smtpPassword,
            to: config.contactToEmail,
          })
        : undefined,
  };
}

/**
 * Production / development server backed by Neon: the REST API under `/api` and the Neon Auth
 * proxy under `/auth` (same in `pnpm dev` and on Vercel).
 */
export function createServerApp(config: Config, fetchFn: typeof fetch = fetch) {
  if (!config.databaseUrl) throw new Error('DATABASE_URL is not defined');
  if (!config.neonAuthUrl) throw new Error('NEON_AUTH_URL is not defined');
  const api = createApp({
    ...baseDeps(config, createNeonDb(config.databaseUrl)),
    verifyToken: createNeonAuthVerifier(config.neonAuthUrl),
  });
  const server = new Hono();
  server.all('/auth/*', createAuthProxy(config.neonAuthUrl, fetchFn));
  server.all('*', (c) => api.fetch(c.req.raw));
  return server;
}
