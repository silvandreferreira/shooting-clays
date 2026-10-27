import { zValidator } from '@hono/zod-validator';
import {
  adminUserUpdateSchema,
  contactInputSchema,
  DISCIPLINES,
  leaderboardQuerySchema,
  profileUpdateSchema,
  revokeInputSchema,
  sessionInputSchema,
  sessionsQuerySchema,
  todayInLisbon,
} from '@shooting-clays/shared';
import { sql } from 'drizzle-orm';
import { Hono, type Context } from 'hono';
import { routePath } from 'hono/route';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { z } from 'zod';
import { createAdminRepo } from './admin-repo';
import { createCommunityRepo } from './community-repo';
import { createContactLimiter, type RateLimiter, type SendContact } from './contact';
import type { AuthUser, VerifyToken } from './auth';
import type { Db } from './db/client';
import { silentLogger, type Logger } from './logger';
import { createNotificationsRepo } from './notifications-repo';
import { createProfilesRepo, toMe, type Profile } from './profiles-repo';
import { createSessionsRepo } from './sessions-repo';

export interface AppDeps {
  db: Db;
  now: () => Date;
  /** Verifies the `Authorization: Bearer` JWT (Neon Auth JWKS; a local key in tests and E2E). */
  verifyToken: VerifyToken;
  /** Lower-case emails of the admins: always active, with `role = 'admin'`. */
  adminEmails: string[];
  logger?: Logger;
  /** Called with unexpected errors (e.g. Sentry). */
  captureException?: (error: unknown) => void;
  /** Sends contact form messages; without it (no SMTP settings) `POST /api/contact` answers 503. */
  sendContact?: SendContact;
  /** Limits contact form messages (one per app instance by default). */
  contactLimiter?: RateLimiter;
  /** Only provided in E2E mode: test-only routes under /api/__test__. Never set outside E2E. */
  testRoutes?: (app: Hono) => void;
}

type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'ACCOUNT_PENDING'
  | 'ACCOUNT_DISABLED'
  | 'ACCOUNT_REVOKED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'UNAVAILABLE';

type AppEnv = { Variables: { user: AuthUser; profile: Profile } };

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
const userIdParamSchema = z.object({ userId: z.string() });

export function createApp(deps: AppDeps) {
  const { db, now, verifyToken, adminEmails, logger = silentLogger, captureException } = deps;
  const { sendContact, contactLimiter = createContactLimiter() } = deps;
  const repo = createSessionsRepo(db);
  const profilesRepo = createProfilesRepo(db);
  const adminRepo = createAdminRepo(db);
  const communityRepo = createCommunityRepo(db);
  const notificationsRepo = createNotificationsRepo(db);
  const dashboard = (userId: string) => repo.dashboard(userId, todayInLisbon(now()));

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

  // Public: the contact form on the public site. Never logs the sender's details or message.
  app.post('/contact', zValidator('json', contactInputSchema, validationHook), async (c) => {
    // On Vercel the first x-forwarded-for address is the client's (set by the platform).
    const sender = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (!contactLimiter.allow(sender)) {
      return errorResponse(c, 429, 'RATE_LIMITED', 'Too many messages, try again later');
    }
    const { website, ...message } = c.req.valid('json');
    // Honeypot filled in: a bot. It gets the same answer as a person, and nothing is sent.
    if (website) return c.json({ ok: true });
    // The admins see it in their notifications, and the owner also gets it by email.
    const notified = await notificationsRepo.notifyAdmins('contact', {
      name: message.name,
      email: message.email,
      message: message.message,
    });
    let emailed = false;
    if (sendContact) {
      try {
        await sendContact(message);
        emailed = true;
      } catch (error) {
        // SMTP errors can quote the addresses: log only the error code.
        const code = (error as { code?: unknown }).code;
        logger.log('error', { message: 'Contact email failed', code: String(code ?? 'unknown') });
      }
    }
    if (!notified && !emailed) {
      return errorResponse(c, 503, 'UNAVAILABLE', 'Could not send the message, try again later');
    }
    return c.json({ ok: true });
  });

  // Every route below requires a signed-in user. Authorization lives here, never only in the UI
  // (CLAUDE.md → Invariants).
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
    // Read on every request, so an admin's change applies at once.
    let profile = await profilesRepo.get(user.id);
    let isNewProfile = false;
    if (!profile) {
      if (!(await profilesRepo.authUserExists(user.id))) {
        return errorResponse(c, 401, 'UNAUTHENTICATED', 'Account not found');
      }
      profile = await profilesRepo.create(user);
      isNewProfile = true;
    }
    // Only a verified address counts: an unverified sign-up must not pass as an admin's email.
    const isAdminEmail = user.emailVerified && adminEmails.includes(user.email.toLowerCase());
    if (isNewProfile && !isAdminEmail) {
      await notificationsRepo.notify(user.id, 'registered', {});
      await notificationsRepo.notifyAdmins('signup', { displayName: profile.displayName });
    }
    if (isAdminEmail && (profile.role !== 'admin' || profile.status !== 'active')) {
      profile = await profilesRepo.promoteToAdmin(user.id);
    }
    c.set('user', user);
    c.set('profile', profile);
    await next();
  });

  // The only endpoint for pending and disabled users: it tells the app what to show.
  app.get('/me', (c) => c.json(toMe(c.get('profile'), c.get('user').email)));

  app.use(async (c, next) => {
    if (c.get('profile').status === 'disabled') {
      return errorResponse(c, 403, 'ACCOUNT_DISABLED', 'Account disabled');
    }
    await next();
  });

  // Notifications: also for pending users (their sign-up was received) and revoked ones (the
  // admin's message is all that is left of the account).
  app.get('/notifications', async (c) => c.json(await notificationsRepo.list(c.get('user').id)));

  app.post('/notifications/:id/read', zValidator('param', idParamSchema), async (c) => {
    const { userId, status } = c.get('profile');
    const { id } = c.req.valid('param');
    const notification = z.uuid().safeParse(id).success
      ? await notificationsRepo.get(userId, id)
      : undefined;
    if (!notification) return errorResponse(c, 404, 'NOT_FOUND', 'Notification not found');
    // Reading the revocation message ends the account: everything about the user is deleted.
    if (notification.kind === 'revoked' && status === 'revoked') {
      await adminRepo.removeUser(userId);
      logger.log('info', { action: 'revoked_user_removed', at: now().toISOString() });
      return c.json({ accountRemoved: true });
    }
    await notificationsRepo.markRead(userId, id, now());
    return c.json(await notificationsRepo.list(userId));
  });

  app.use(async (c, next) => {
    const { status } = c.get('profile');
    if (status === 'pending') {
      return errorResponse(c, 403, 'ACCOUNT_PENDING', 'Account waiting for approval');
    }
    if (status === 'revoked') {
      return errorResponse(c, 403, 'ACCOUNT_REVOKED', 'Access revoked');
    }
    await next();
  });

  app.put('/me/profile', zValidator('json', profileUpdateSchema, validationHook), async (c) => {
    const user = c.get('user');
    const profile = await profilesRepo.update(user.id, c.req.valid('json'));
    if (!profile) return errorResponse(c, 404, 'NOT_FOUND', 'Profile not found');
    return c.json(toMe(profile, user.email));
  });

  app.use('/admin/*', async (c, next) => {
    if (c.get('profile').role !== 'admin') {
      return errorResponse(c, 403, 'FORBIDDEN', 'Admins only');
    }
    await next();
  });

  /** Admins never act on admin accounts (their own included): ADMIN_EMAILS decides those. */
  async function targetError(c: Context, userId: string) {
    const target = await profilesRepo.get(userId);
    if (!target) return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
    if (target.role === 'admin') {
      return errorResponse(c, 403, 'FORBIDDEN', 'Admin accounts cannot be changed here');
    }
  }

  app.get('/admin/users', async (c) => c.json(await adminRepo.listUsers()));

  app.patch(
    '/admin/users/:userId',
    zValidator('param', userIdParamSchema),
    zValidator('json', adminUserUpdateSchema, validationHook),
    async (c) => {
      const adminId = c.get('user').id;
      const { userId } = c.req.valid('param');
      const error = await targetError(c, userId);
      if (error) return error;
      const before = await profilesRepo.get(userId);
      if (before?.status === 'revoked') {
        return errorResponse(c, 403, 'FORBIDDEN', 'A revoked account can only be removed');
      }
      const { status } = c.req.valid('json');
      const profile = await profilesRepo.setStatus(userId, status);
      if (!profile) return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
      if (status === 'active' && before?.status !== 'active') {
        await notificationsRepo.notify(userId, 'approved', {});
      }
      logger.log('info', { action: 'user_status_changed', adminId, status });
      return c.json({ userId, status: profile.status });
    },
  );

  app.post(
    '/admin/users/:userId/revoke',
    zValidator('param', userIdParamSchema),
    zValidator('json', revokeInputSchema, validationHook),
    async (c) => {
      const adminId = c.get('user').id;
      const { userId } = c.req.valid('param');
      const error = await targetError(c, userId);
      if (error) return error;
      if (!(await adminRepo.revokeUser(userId, c.req.valid('json').message))) {
        return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
      }
      // Neither the message nor the user's name in the log.
      logger.log('info', { action: 'user_revoked', adminId, at: now().toISOString() });
      return c.json({ userId, status: 'revoked' });
    },
  );

  app.delete('/admin/users/:userId', zValidator('param', userIdParamSchema), async (c) => {
    const adminId = c.get('user').id;
    const { userId } = c.req.valid('param');
    const error = await targetError(c, userId);
    if (error) return error;
    if (!(await adminRepo.removeUser(userId))) {
      return errorResponse(c, 404, 'NOT_FOUND', 'User not found');
    }
    // No personal data in the log (docs/roadmap.md → Iteration 3).
    logger.log('info', { action: 'user_removed', adminId, at: now().toISOString() });
    return c.json({ removed: true });
  });

  app.get('/disciplines', (c) => c.json(DISCIPLINES));

  app.get(
    '/community/leaderboard',
    zValidator('query', leaderboardQuerySchema, validationHook),
    async (c) => {
      const profile = c.get('profile');
      const query = c.req.valid('query');
      return c.json(
        await communityRepo.leaderboard(profile.userId, !profile.showInCommunity, {
          ...query,
          date: query.date ?? todayInLisbon(now()),
        }),
      );
    },
  );

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
