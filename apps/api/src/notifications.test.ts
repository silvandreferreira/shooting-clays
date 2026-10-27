import type { AdminUser, Me, NotificationList } from '@shooting-clays/shared';
import { count, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { notifications, profiles, sessions } from './db/schema';
import type { LogFields } from './logger';
import { createTestApp, NEWCOMER, OTHER, OWNER } from './test-utils';

const REVOKE_MESSAGE = 'Thank you for your interest. Your access was revoked.';

async function setup() {
  const logs: LogFields[] = [];
  const t = await createTestApp({
    deps: { logger: { log: (_level, fields) => logs.push(fields) } },
  });
  // The owner signs in first, so they are an admin when others sign up.
  await t.json('GET', '/api/me', undefined, OWNER);
  const list = async (as = OWNER) =>
    (await (await t.json('GET', '/api/notifications', undefined, as)).json()) as NotificationList;
  return { ...t, logs, list };
}

// R46: notifications API.
describe('notifications', () => {
  it('a new sign-up: the user is told it was received, every admin that it waits for approval', async () => {
    const { json, list } = await setup();
    expect(await list()).toEqual({ items: [], unread: 0 });

    await json('GET', '/api/me', undefined, NEWCOMER);
    // Pending users can read their notifications.
    expect(await list(NEWCOMER)).toMatchObject({
      items: [{ kind: 'registered', params: {}, readAt: null }],
      unread: 1,
    });
    expect(await list()).toMatchObject({
      items: [{ kind: 'signup', params: { displayName: NEWCOMER.name } }],
      unread: 1,
    });

    // Signing in again notifies nobody; the admin's own first sign-in notified nobody either.
    await json('GET', '/api/me', undefined, NEWCOMER);
    expect((await list()).items).toHaveLength(1);
    expect((await list(NEWCOMER)).items).toHaveLength(1);
  });

  it('approving the account tells the user it is active (once, not on undo and redo)', async () => {
    const { json, list } = await setup();
    await json('GET', '/api/me', undefined, NEWCOMER);
    await json('PATCH', `/api/admin/users/${NEWCOMER.id}`, { status: 'active' });
    expect((await list(NEWCOMER)).items.map((n) => n.kind)).toEqual(['approved', 'registered']);
    await json('PATCH', `/api/admin/users/${NEWCOMER.id}`, { status: 'active' });
    expect((await list(NEWCOMER)).items).toHaveLength(2);
  });

  it('"Read" marks one notification as read; only the owner of a notification can', async () => {
    const { json, list } = await setup();
    await json('GET', '/api/me', undefined, NEWCOMER);
    const [note] = (await list(NEWCOMER)).items;

    expect(
      (await json('POST', `/api/notifications/${note!.id}/read`, undefined, OTHER)).status,
    ).toBe(404);
    expect(
      (await json('POST', '/api/notifications/not-a-uuid/read', undefined, NEWCOMER)).status,
    ).toBe(404);

    const res = await json('POST', `/api/notifications/${note!.id}/read`, undefined, NEWCOMER);
    const after = (await res.json()) as NotificationList;
    expect(after.unread).toBe(0);
    expect(after.items[0]?.readAt).not.toBeNull();
  });

  it('a disabled user cannot read notifications', async () => {
    const { json } = await setup();
    await json('PATCH', `/api/admin/users/${OTHER.id}`, { status: 'disabled' });
    const res = await json('GET', '/api/notifications', undefined, OTHER);
    expect(res.status).toBe(403);
  });

  it('a contact form message reaches every admin', async () => {
    const { app, list } = await setup();
    const res = await app.request('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ana',
        email: 'ana@example.test',
        message: 'A message long enough.',
        locale: 'pt-PT',
      }),
    });
    // No SMTP settings here: the notification alone is enough.
    expect(res.status).toBe(200);
    expect(await list()).toMatchObject({
      items: [
        {
          kind: 'contact',
          params: { name: 'Ana', email: 'ana@example.test', message: 'A message long enough.' },
        },
      ],
    });
  });
});

// R47: revoking access.
describe('revoke', () => {
  it('deletes the data at once, keeps only the message, and removes the account when it is read', async () => {
    const { db, json, list, logs } = await setup();
    await json(
      'POST',
      '/api/sessions',
      { date: '2026-10-23', discipline: 'trap', score: 20 },
      OTHER,
    );

    expect(
      (await json('POST', `/api/admin/users/${OTHER.id}/revoke`, { message: ' ' })).status,
    ).toBe(400);
    const res = await json('POST', `/api/admin/users/${OTHER.id}/revoke`, {
      message: REVOKE_MESSAGE,
    });
    expect(await res.json()).toEqual({ userId: OTHER.id, status: 'revoked' });
    const [left] = await db
      .select({ n: count() })
      .from(sessions)
      .where(eq(sessions.userId, OTHER.id));
    expect(left!.n).toBe(0);
    expect(JSON.stringify(logs)).not.toContain(REVOKE_MESSAGE);

    // The admin list shows the account as revoked; the switch cannot bring it back.
    const users = (await (await json('GET', '/api/admin/users')).json()) as AdminUser[];
    expect(users.find((u) => u.userId === OTHER.id)).toMatchObject({
      status: 'revoked',
      sessionCount: 0,
    });
    expect((await json('PATCH', `/api/admin/users/${OTHER.id}`, { status: 'active' })).status).toBe(
      403,
    );

    // The user sees only their status and the message.
    expect(((await (await json('GET', '/api/me', undefined, OTHER)).json()) as Me).status).toBe(
      'revoked',
    );
    const dashboard = await json('GET', '/api/dashboard', undefined, OTHER);
    expect(dashboard.status).toBe(403);
    expect(await dashboard.json()).toMatchObject({ error: { code: 'ACCOUNT_REVOKED' } });
    const { items } = await list(OTHER);
    expect(items).toMatchObject([{ kind: 'revoked', params: { message: REVOKE_MESSAGE } }]);

    const read = await json('POST', `/api/notifications/${items[0]!.id}/read`, undefined, OTHER);
    expect(await read.json()).toEqual({ accountRemoved: true });
    expect(await db.select().from(profiles).where(eq(profiles.userId, OTHER.id))).toEqual([]);
    expect(await db.select().from(notifications).where(eq(notifications.userId, OTHER.id))).toEqual(
      [],
    );
    expect((await json('GET', '/api/me', undefined, OTHER)).status).toBe(401);
  });

  it('admins only, never on an admin account', async () => {
    const { json } = await setup();
    const body = { message: REVOKE_MESSAGE };
    expect((await json('POST', `/api/admin/users/${OWNER.id}/revoke`, body, OTHER)).status).toBe(
      403,
    );
    expect((await json('POST', `/api/admin/users/${OWNER.id}/revoke`, body)).status).toBe(403);
    expect((await json('POST', '/api/admin/users/nobody/revoke', body)).status).toBe(404);
  });

  it('an admin can still remove a revoked account before it is read', async () => {
    const { db, json } = await setup();
    await json('POST', `/api/admin/users/${OTHER.id}/revoke`, { message: REVOKE_MESSAGE });
    expect((await json('DELETE', `/api/admin/users/${OTHER.id}`)).status).toBe(200);
    expect(await db.select().from(profiles).where(eq(profiles.userId, OTHER.id))).toEqual([]);
  });
});
