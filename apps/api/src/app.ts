import { zValidator } from '@hono/zod-validator';
import {
  DISCIPLINES,
  sessionInputSchema,
  sessionsQuerySchema,
  todayInLisbon,
} from '@shooting-clays/shared';
import { sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { routePath } from 'hono/route';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { LOCAL_USER_ID } from './config';
import type { Db } from './db/client';
import { silentLogger, type Logger } from './logger';
import { createSessionsRepo } from './sessions-repo';

export interface AppDeps {
  db: Db;
  now: () => Date;
  logger?: Logger;
  /** Called with unexpected errors (e.g. Sentry). */
  captureException?: (error: unknown) => void;
  /** Only provided in E2E mode: reseeds the database. Never set outside E2E. */
  resetForTests?: () => Promise<void>;
}

type ErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR' | 'UNAVAILABLE';

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
  const { db, now, logger = silentLogger, captureException } = deps;
  const repo = createSessionsRepo(db);
  const userId = LOCAL_USER_ID;
  const dashboard = () => repo.dashboard(userId, todayInLisbon(now()));

  const app = new Hono().basePath('/api');

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

  app.get('/disciplines', (c) => c.json(DISCIPLINES));

  app.get('/dashboard', async (c) => c.json(await dashboard()));

  app.get('/sessions', zValidator('query', sessionsQuerySchema, validationHook), async (c) =>
    c.json(await repo.list(userId, c.req.valid('query'))),
  );

  app.post('/sessions', zValidator('json', sessionInputSchema, validationHook), async (c) => {
    const session = await repo.create(userId, c.req.valid('json'));
    return c.json({ session, dashboard: await dashboard() }, 201);
  });

  app.put(
    '/sessions/:id',
    zValidator('param', idParamSchema),
    zValidator('json', sessionInputSchema, validationHook),
    async (c) => {
      const { id } = c.req.valid('param');
      if (!z.uuid().safeParse(id).success) return errorResponse(c, 404, 'NOT_FOUND', 'Not found');
      const session = await repo.update(userId, id, c.req.valid('json'));
      if (!session) return errorResponse(c, 404, 'NOT_FOUND', 'Session not found');
      return c.json({ session, dashboard: await dashboard() });
    },
  );

  app.delete('/sessions/:id', zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param');
    if (!z.uuid().safeParse(id).success) return errorResponse(c, 404, 'NOT_FOUND', 'Not found');
    if (!(await repo.remove(userId, id))) {
      return errorResponse(c, 404, 'NOT_FOUND', 'Session not found');
    }
    return c.json({ dashboard: await dashboard() });
  });

  if (deps.resetForTests) {
    const reset = deps.resetForTests;
    app.post('/__test__/reset', async (c) => {
      await reset();
      return c.json({ ok: true });
    });
  }

  return app;
}

export type App = ReturnType<typeof createApp>;
