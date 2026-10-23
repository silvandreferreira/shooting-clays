import { zValidator } from '@hono/zod-validator';
import {
  DISCIPLINES,
  profileUpdateSchema,
  sessionInputSchema,
  sessionsQuerySchema,
  todayInLisbon,
} from '@shooting-clays/shared';
import { sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { routePath } from 'hono/route';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import type { AuthUser, VerifyToken } from './auth';
import type { Db } from './db/client';
import { silentLogger, type Logger } from './logger';
import { createProfilesRepo } from './profiles-repo';
import { createSessionsRepo } from './sessions-repo';

export interface AppDeps {
  db: Db;
  now: () => Date;
  /** Verifies the `Authorization: Bearer` JWT (Neon Auth JWKS; a local key in tests and E2E). */
  verifyToken: VerifyToken;
  /** Lower-case emails allowed in (iteration 2 safeguard until account approval exists). */
  adminEmails: string[];
  logger?: Logger;
  /** Called with unexpected errors (e.g. Sentry). */
  captureException?: (error: unknown) => void;
  /** Only provided in E2E mode: test-only routes under /api/__test__. Never set outside E2E. */
  testRoutes?: (app: Hono) => void;
}

type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'ACCESS_NOT_OPEN'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'UNAVAILABLE';

type AppEnv = { Variables: { user: AuthUser } };

function errorResponse(
  c: Context,
  status: ContentfulStatusCode,
  code: ErrorCode,
  message: string,
  details: Record<string, unknown> = {},
) {
  return c.json({ error: { code, message, details } }, status);
}

/** zValidator hook: turn schema failures into our error format. */
interface ValidationResult {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}

function validationHook(result: ValidationResult, c: Context) {
  if (!result.success && result.error) {
    const issue = result.error.issues[0];
    return errorResponse(c, 400, 'VALIDATION_ERROR', issue?.message ?? 'Invalid request', {
      issues: result.error.issues.map((i) => ({
        path: i.path.map(String).join('.'),
        message: i.message,
      })),
    });
  }
}

const idParamSchema = z.object({ id: z.string() });

export function createApp(deps: AppDeps) {
  const { db, now, verifyToken, adminEmails, logger = silentLogger, captureException } = deps;
  const repo = createSessionsRepo(db);
  const profilesRepo = createProfilesRepo(db);
  const dashboard = (userId: string) => repo.dashboard(userId, todayInLisbon(now()));
  // Profiles already known to exist in this process: skips the insert on later requests.
  const knownProfiles = new Set<string>();

  const app = new Hono<AppEnv>().basePath('/api');

  app.use(async (c, next) => {
    const start = performance.now();
    const requestId = c.req.header('x-request-id') ?? crypto.randomUUID();
    c.header('x-request-id', requestId);
    await next();
    logger.log(c.res.status >= 500 ? 'error' : 'info', {
      requestId,
      method: c.req.method,
      route: routePath(c),
      status: c.res.status,
      durationMs: Math.round(performance.now() - start),
    });
  });

  app.onError((error, c) => {
    logger.log('error', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      method: c.req.method,
      route: routePath(c),
    });
    captureException?.(error);
    return errorResponse(c, 500, 'INTERNAL_ERROR', 'Unexpected error');
  });

  app.notFound((c) => errorResponse(c, 404, 'NOT_FOUND', 'Not found'));

  // Liveness only: must never touch the database (see docs/observability.md).
  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/health/db', async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ ok: true });
    } catch {
      return errorResponse(c, 503, 'UNAVAILABLE', 'Database unreachable');
    }
  });

  if (deps.testRoutes) deps.testRoutes(app as unknown as Hono);

  // Every route below requires a signed-in, allowed user. Authorization lives here, never only in
  // the UI (CLAUDE.md → Invariants).
  app.use(async (c, next) => {
    const header = c.req.header('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : undefined;
    if (!token) return errorResponse(c, 401, 'UNAUTHENTICATED', 'Sign in required');
    let user: AuthUser;
    try {
      user = await verifyToken(token);
    } catch {
      return errorResponse(c, 401, 'UNAUTHENTICATED', 'Session expired or invalid');
    }
    // Only verified addresses count: an unverified sign-up must not pass as an allowed email.
    if (!user.emailVerified || !adminEmails.includes(user.email.toLowerCase())) {
      // The reason helps diagnose sign-in problems; never log the email itself.
      logger.log('warn', {
        message: 'access denied',
        reason: user.emailVerified ? 'email_not_allowed' : 'email_not_verified',
      });
      return errorResponse(c, 403, 'ACCESS_NOT_OPEN', 'Access is not open yet');
    }
    if (!knownProfiles.has(user.id)) {
      await profilesRepo.ensure(user);
      knownProfiles.add(user.id);
    }
    c.set('user', user);
    await next();
  });

  app.get('/me/profile', async (c) => {
    const user = c.get('user');
    const profile = await profilesRepo.get(user.id);
    if (!profile) return errorResponse(c, 404, 'NOT_FOUND', 'Profile not found');
    return c.json({ ...profile, email: user.email });
  });

  app.put('/me/profile', zValidator('json', profileUpdateSchema, validationHook), async (c) => {
    const user = c.get('user');
    const profile = await profilesRepo.update(user.id, c.req.valid('json'));
    if (!profile) return errorResponse(c, 404, 'NOT_FOUND', 'Profile not found');
    return c.json({ ...profile, email: user.email });
  });

  app.get('/disciplines', (c) => c.json(DISCIPLINES));

  app.get('/dashboard', async (c) => c.json(await dashboard(c.get('user').id)));

  app.get('/sessions', zValidator('query', sessionsQuerySchema, validationHook), async (c) =>
    c.json(await repo.list(c.get('user').id, c.req.valid('query'))),
  );

  app.post('/sessions', zValidator('json', sessionInputSchema, validationHook), async (c) => {
    const userId = c.get('user').id;
    const session = await repo.create(userId, c.req.valid('json'));
    return c.json({ session, dashboard: await dashboard(userId) }, 201);
  });

  app.put(
    '/sessions/:id',
    zValidator('param', idParamSchema),
    zValidator('json', sessionInputSchema, validationHook),
    async (c) => {
      const userId = c.get('user').id;
      const { id } = c.req.valid('param');
      if (!z.uuid().safeParse(id).success) return errorResponse(c, 404, 'NOT_FOUND', 'Not found');
      const session = await repo.update(userId, id, c.req.valid('json'));
      if (!session) return errorResponse(c, 404, 'NOT_FOUND', 'Session not found');
      return c.json({ session, dashboard: await dashboard(userId) });
    },
  );

  app.delete('/sessions/:id', zValidator('param', idParamSchema), async (c) => {
    const userId = c.get('user').id;
    const { id } = c.req.valid('param');
    if (!z.uuid().safeParse(id).success) return errorResponse(c, 404, 'NOT_FOUND', 'Not found');
    if (!(await repo.remove(userId, id))) {
      return errorResponse(c, 404, 'NOT_FOUND', 'Session not found');
    }
    return c.json({ dashboard: await dashboard(userId) });
  });

  return app;
}

export type App = ReturnType<typeof createApp>;
