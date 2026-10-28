import type { AdminUser, Me } from '@shooting-clays/shared';
import { count, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { rowsOf } from './db/client';
import { profiles, sessions } from './db/schema';
import type { LogFields } from './logger';
import { createProfilesRepo } from './profiles-repo';
import { createTestApp, historyRows, NEWCOMER, OTHER, OWNER } from './test-utils';

const newSession = {
  date: '2026-10-23',
  discipline: 'compak',
  score: 20,
  clubId: 'ccm',
  fieldId: '3',
};

/** Every endpoint that needs an active account, with a valid body where one is required. */
const DATA_ENDPOINTS: [string, string, unknown?][] = [
  ['GET', '/api/dashboard'],
  ['GET', '/api/disciplines'],
  ['GET', '/api/community/leaderboard?discipline=trap'],
  ['GET', '/api/sessions'],
  ['POST', '/api/sessions', newSession],
  ['PUT', '/api/sessions/00000000-0000-0000-0000-000000000000', newSession],
  ['DELETE', '/api/sessions/00000000-0000-0000-0000-000000000000'],
  ['PUT', '/api/me/profile', { displayName: 'Someone' }],
  ['GET', '/api/admin/users'],
];

async function countRows(db: Awaited<ReturnType<typeof createTestApp>>['db'], userId: string) {
  const [s] = await db.select({ n: count() }).from(sessions).where(eq(sessions.userId, userId));
  const [p] = await db.select({ n: count() }).from(profiles).where(eq(profiles.userId, userId));
  const auth = rowsOf(
    await db.execute(sql`select 1 from neon_auth."user" where id::text = ${userId}`),
  );
  return { sessions: s!.n, profiles: p!.n, authUsers: auth.length };
}

// R19: account states and admin, enforced by the API.
describe('account states', () => {
  it('a pending user can only call GET /api/me and the notifications; everything else is 403 ACCOUNT_PENDING', async () => {
    const { json } = await createTestApp({ empty: true });
    expect(await (await json('GET', '/api/me', undefined, NEWCOMER)).json()).toMatchObject({
      status: 'pending',
    });
    for (const [method, path, body] of DATA_ENDPOINTS) {
      const res = await json(method, path, body, NEWCOMER);
      expect(res.status, `${method} ${path}`).toBe(403);
      expect(await res.json()).toMatchObject({ error: { code: 'ACCOUNT_PENDING' } });
    }
  });

  it('a disabled user gets 403 ACCOUNT_DISABLED everywhere but keeps their data', async () => {
    const { json, db } = await createTestApp({ empty: true });
    await json('POST', '/api/sessions', newSession, OTHER);
    await createProfilesRepo(db).setStatus(OTHER.id, 'disabled');

    expect(await (await json('GET', '/api/me', undefined, OTHER)).json()).toMatchObject({
      status: 'disabled',
    });
    for (const [method, path, body] of DATA_ENDPOINTS) {
      const res = await json(method, path, body, OTHER);
      expect(res.status, `${method} ${path}`).toBe(403);
      expect(await res.json()).toMatchObject({ error: { code: 'ACCOUNT_DISABLED' } });
    }
    expect((await countRows(db, OTHER.id)).sessions).toBe(1);
  });

  it('ADMIN_EMAILS (any letter case) makes the user an active admin', async () => {
    const { json } = await createTestApp({ empty: true });
    const res = await json('GET', '/api/me', undefined, { ...OWNER, email: 'Owner@Example.TEST' });
    expect((await res.json()) as Me).toMatchObject({ role: 'admin', status: 'active' });
  });

  it('an unverified email in ADMIN_EMAILS is not an admin', async () => {
    const { json } = await createTestApp({ empty: true });
    const res = await json('GET', '/api/me', undefined, { ...OWNER, emailVerified: false });
    expect((await res.json()) as Me).toMatchObject({ role: 'user', status: 'pending' });
  });
});

describe('admin', () => {
  it('only admins reach /api/admin/* (403 FORBIDDEN for active users)', async () => {
    const { json } = await createTestApp({ empty: true });
    for (const [method, path, body] of [
      ['GET', '/api/admin/users'],
      ['PATCH', `/api/admin/users/${NEWCOMER.id}`, { status: 'active' }],
      ['DELETE', `/api/admin/users/${NEWCOMER.id}`],
    ] as const) {
      const res = await json(method, path, body, OTHER);
      expect(res.status, `${method} ${path}`).toBe(403);
      expect(await res.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
    }
  });

  it('lists users pending first, with email, sign-up date, session count and last activity', async () => {
    const { json } = await createTestApp();
    await json('GET', '/api/me', undefined, NEWCOMER);
    const users = (await (await json('GET', '/api/admin/users')).json()) as AdminUser[];
    expect(users.map((u) => [u.userId, u.status, u.email])).toEqual([
      [NEWCOMER.id, 'pending', NEWCOMER.email],
      [OTHER.id, 'active', OTHER.email],
      [OWNER.id, 'active', OWNER.email],
    ]);
    const owner = users.find((u) => u.userId === OWNER.id)!;
    expect(owner).toMatchObject({ role: 'admin', sessionCount: historyRows().length });
    expect(owner.lastActivityAt).not.toBeNull();
    expect(users.find((u) => u.userId === NEWCOMER.id)).toMatchObject({
      sessionCount: 0,
      lastActivityAt: null,
    });
    expect(owner.signedUpAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('approving a pending user lets them in at once; disabling blocks them again', async () => {
    const { json } = await createTestApp({ empty: true });
    expect((await json('GET', '/api/dashboard', undefined, NEWCOMER)).status).toBe(403);

    const approve = await json('PATCH', `/api/admin/users/${NEWCOMER.id}`, { status: 'active' });
    expect(await approve.json()).toEqual({ userId: NEWCOMER.id, status: 'active' });
    expect((await json('GET', '/api/dashboard', undefined, NEWCOMER)).status).toBe(200);

    await json('PATCH', `/api/admin/users/${NEWCOMER.id}`, { status: 'disabled' });
    const blocked = await json('GET', '/api/dashboard', undefined, NEWCOMER);
    expect(await blocked.json()).toMatchObject({ error: { code: 'ACCOUNT_DISABLED' } });

    // Undo goes back to the previous state, pending included.
    await json('PATCH', `/api/admin/users/${NEWCOMER.id}`, { status: 'pending' });
    const me = await json('GET', '/api/me', undefined, NEWCOMER);
    expect(await me.json()).toMatchObject({ status: 'pending' });
  });

  it('validates the status and reports unknown users', async () => {
    const { json } = await createTestApp({ empty: true });
    const bad = await json('PATCH', `/api/admin/users/${OTHER.id}`, { status: 'banned' });
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: { code: 'VALIDATION_ERROR' } });
    expect((await json('PATCH', '/api/admin/users/nobody', { status: 'active' })).status).toBe(404);
    expect((await json('DELETE', '/api/admin/users/nobody')).status).toBe(404);
  });

  it('an admin can never disable or remove their own (or another admin) account', async () => {
    const { json, db } = await createTestApp();
    for (const res of [
      await json('PATCH', `/api/admin/users/${OWNER.id}`, { status: 'disabled' }),
      await json('DELETE', `/api/admin/users/${OWNER.id}`),
    ]) {
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({ error: { code: 'FORBIDDEN' } });
    }
    expect(await countRows(db, OWNER.id)).toEqual({
      sessions: historyRows().length,
      profiles: 1,
      authUsers: 1,
    });
  });

  it('removal deletes every row of that user, including Neon Auth, and nothing else', async () => {
    const logs: LogFields[] = [];
    const { json, db } = await createTestApp({
      deps: { logger: { log: (_level, fields) => logs.push(fields) } },
    });
    await json('POST', '/api/sessions', newSession, OTHER);
    await json('POST', '/api/sessions', newSession, OTHER);

    const res = await json('DELETE', `/api/admin/users/${OTHER.id}`);
    expect(res.status).toBe(200);
    expect(await countRows(db, OTHER.id)).toEqual({ sessions: 0, profiles: 0, authUsers: 0 });
    expect(await countRows(db, OWNER.id)).toEqual({
      sessions: historyRows().length,
      profiles: 1,
      authUsers: 1,
    });

    // The removed user's token is still valid for a while, but the account is gone.
    expect((await json('GET', '/api/me', undefined, OTHER)).status).toBe(401);
    expect(await countRows(db, OTHER.id)).toEqual({ sessions: 0, profiles: 0, authUsers: 0 });

    const removal = logs.find((l) => l.action === 'user_removed');
    expect(Object.keys(removal!).sort()).toEqual(['action', 'adminId', 'at']);
    expect(JSON.stringify(logs)).not.toContain(OTHER.email);
  });
});
