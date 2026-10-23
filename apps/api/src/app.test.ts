import type { Dashboard, Me, Session } from '@shooting-clays/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { createTestAuth } from './auth';
import { loadConfig } from './config';
import { createMemoryDb } from './db/memory';
import { importHistory } from './import/history-csv';
import { createProfilesRepo } from './profiles-repo';
import { createTestApp, historyRows, NEWCOMER, OTHER, OWNER } from './test-utils';

const newSession = {
  date: '2026-10-23',
  discipline: 'compak',
  score: 25,
  hardestTargets: ['E', 'B'],
  notes: 'Field A',
};

const neverCalled = async () => {
  throw new Error('not expected');
};

describe('health', () => {
  it('GET /api/health answers without touching the database or auth', async () => {
    const db = new Proxy({} as never, {
      get: () => {
        throw new Error('database accessed');
      },
    });
    const app = createApp({ db, now: () => new Date(), verifyToken: neverCalled, adminEmails: [] });
    const res = await app.request('/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('GET /api/health/db runs a query', async () => {
    const { app } = await createTestApp({ empty: true });
    expect((await app.request('/api/health/db')).status).toBe(200);
  });

  it('GET /api/health/db returns 503 when the database is unreachable', async () => {
    const db = { execute: () => Promise.reject(new Error('down')) } as never;
    const app = createApp({ db, now: () => new Date(), verifyToken: neverCalled, adminEmails: [] });
    const res = await app.request('/api/health/db');
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: { code: 'UNAVAILABLE' } });
  });
});

describe('authentication', () => {
  it.each(['/api/dashboard', '/api/sessions', '/api/disciplines', '/api/me', '/api/admin/users'])(
    'GET %s without a token returns 401 UNAUTHENTICATED',
    async (path) => {
      const { json } = await createTestApp({ empty: true });
      const res = await json('GET', path, undefined, null);
      expect(res.status).toBe(401);
      expect(await res.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
    },
  );

  it('rejects tokens with a bad signature or that have expired', async () => {
    const { app, testAuth } = await createTestApp({ empty: true });
    const otherKey = await createTestAuth();
    const expired = await testAuth.signToken(OWNER, '-1m');
    for (const token of [await otherKey.signToken(OWNER), expired, 'not-a-jwt']) {
      const res = await app.request('/api/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.status).toBe(401);
    }
  });

  it('returns 401 for a valid token whose user no longer exists in Neon Auth (removed)', async () => {
    const { json } = await createTestApp({ empty: true });
    const ghost = { id: 'ghost', email: 'ghost@example.test', name: 'Ghost' };
    const res = await json('GET', '/api/me', undefined, ghost);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: { code: 'UNAUTHENTICATED' } });
  });
});

describe('profile', () => {
  it('is created on the first request as pending, with the name from the token', async () => {
    const { json, db } = await createTestApp({ empty: true });
    expect(await createProfilesRepo(db).get(NEWCOMER.id)).toBeUndefined();
    const res = await json('GET', '/api/me', undefined, NEWCOMER);
    expect(res.status).toBe(200);
    expect((await res.json()) as Me).toEqual({
      displayName: 'New Comer',
      avatarUrl: null,
      email: NEWCOMER.email,
      role: 'user',
      status: 'pending',
    });
  });

  it('can be renamed, and the new name is kept on later sign-ins', async () => {
    const { json } = await createTestApp({ empty: true });
    const put = await json('PUT', '/api/me/profile', { displayName: '  Ace  ' });
    expect(await put.json()).toMatchObject({ displayName: 'Ace' });
    const get = await json('GET', '/api/me');
    expect(await get.json()).toMatchObject({ displayName: 'Ace' });
    expect((await json('PUT', '/api/me/profile', { displayName: ' ' })).status).toBe(400);
  });
});

describe('GET /api/disciplines', () => {
  it('lists disciplines with their target-letter flag', async () => {
    const { json } = await createTestApp({ empty: true });
    const body = await (await json('GET', '/api/disciplines')).json();
    expect(body).toContainEqual({ key: 'compak', hasTargetLetters: true });
    expect(body).toContainEqual({ key: 'fosso', hasTargetLetters: false });
  });
});

describe('GET /api/dashboard', () => {
  it('returns the reference values for the imported history (R1)', async () => {
    const { json } = await createTestApp();
    const dashboard = (await (await json('GET', '/api/dashboard')).json()) as Dashboard;
    expect(dashboard.referenceDate).toBe('2026-10-23');
    expect(dashboard.periods.allTime.compak).toMatchObject({ avg: 16, min: 8, max: 23 });
    expect(dashboard.periods.lastMonth.compak).toMatchObject({ avg: 18, min: 14, max: 23 });
    expect(dashboard.periods.thisMonth.compak).toMatchObject({ avg: 16, min: 13, max: 18 });
    expect(dashboard.periods.thisMonth.fosso).toEqual({
      avg: null,
      min: null,
      max: null,
      count: 0,
    });
    expect(dashboard.periods.lastMonth.trap.count).toBe(0);
  });
});

describe('sessions', () => {
  it('creates a session and returns it with the recalculated dashboard', async () => {
    const { json } = await createTestApp({ empty: true });
    const res = await json('POST', '/api/sessions', newSession);
    expect(res.status).toBe(201);
    const body = (await res.json()) as { session: Session; dashboard: Dashboard };
    expect(body.session).toMatchObject({ ...newSession, hardestTargets: ['B', 'E'] });
    expect(body.session.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.dashboard.periods.thisMonth.compak).toEqual({
      avg: 25,
      min: 25,
      max: 25,
      count: 1,
    });
  });

  it.each([
    [{ ...newSession, score: 26 }, 'score must be between 0 and 25'],
    [{ ...newSession, score: -1 }, 'score must be between 0 and 25'],
    [{ ...newSession, discipline: 'trap' }, 'hardestTargets are only allowed'],
    [{ ...newSession, date: 'yesterday' }, 'date must be a valid'],
  ])('rejects invalid input with 400 VALIDATION_ERROR', async (body, message) => {
    const { json } = await createTestApp({ empty: true });
    const res = await json('POST', '/api/sessions', body);
    expect(res.status).toBe(400);
    const error = ((await res.json()) as { error: { code: string; message: string } }).error;
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toContain(message);
  });

  it('lists sessions newest first and filters by discipline and dates', async () => {
    const { json } = await createTestApp();
    const all = (await (await json('GET', '/api/sessions')).json()) as Session[];
    expect(all).toHaveLength(historyRows().length);
    expect(all[0]!.date).toBe('2026-10-23');
    expect(all.at(-1)!.date).toBe('2026-04-12');

    const trap = (await (
      await json('GET', '/api/sessions?discipline=trap&from=2026-10-14&to=2026-10-31')
    ).json()) as Session[];
    expect(trap.map((s) => [s.date, s.score])).toEqual([
      ['2026-10-23', 18],
      ['2026-10-17', 19],
    ]);

    expect((await json('GET', '/api/sessions?discipline=skeet')).status).toBe(400);
  });

  it('updates a session and returns the new dashboard', async () => {
    const { json } = await createTestApp({ empty: true });
    const { session } = (await (await json('POST', '/api/sessions', newSession)).json()) as {
      session: Session;
    };
    const res = await json('PUT', `/api/sessions/${session.id}`, { ...newSession, score: 20 });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { session: Session; dashboard: Dashboard };
    expect(body.session.score).toBe(20);
    expect(body.dashboard.periods.allTime.compak.max).toBe(20);
    expect(Date.parse(body.session.updatedAt)).toBeGreaterThanOrEqual(
      Date.parse(session.updatedAt),
    );
  });

  it('deletes a session and returns the new dashboard', async () => {
    const { json } = await createTestApp({ empty: true });
    const { session } = (await (await json('POST', '/api/sessions', newSession)).json()) as {
      session: Session;
    };
    const res = await json('DELETE', `/api/sessions/${session.id}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { dashboard: Dashboard };
    expect(body.dashboard.periods.allTime.compak.count).toBe(0);
    expect((await json('DELETE', `/api/sessions/${session.id}`)).status).toBe(404);
  });

  it.each(['00000000-0000-4000-8000-000000000000', 'not-a-uuid'])(
    'returns 404 NOT_FOUND for unknown id %s',
    async (id) => {
      const { json } = await createTestApp({ empty: true });
      const put = await json('PUT', `/api/sessions/${id}`, newSession);
      expect(put.status).toBe(404);
      expect(await put.json()).toMatchObject({ error: { code: 'NOT_FOUND' } });
      expect((await json('DELETE', `/api/sessions/${id}`)).status).toBe(404);
    },
  );

  it('returns 500 INTERNAL_ERROR without details for unexpected errors', async () => {
    const captured: unknown[] = [];
    const db = await createMemoryDb();
    // Sessions queries fail; profile creation (insert) still works so auth passes.
    const broken = new Proxy(db, {
      get: (target, prop) =>
        prop === 'select'
          ? () => {
              throw new Error('boom: secret detail');
            }
          : Reflect.get(target, prop),
    });
    const { json } = await createTestApp({
      empty: true,
      deps: { db: broken, captureException: (e) => captured.push(e) },
    });
    const res = await json('GET', '/api/sessions');
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain('INTERNAL_ERROR');
    expect(text).not.toContain('secret');
    expect(captured).toHaveLength(1);
  });
});

// Iteration 2: a user can never read, change or delete another user's sessions.
describe('data isolation between users', () => {
  it("never shows another user's sessions or statistics", async () => {
    const { json } = await createTestApp();
    const sessions = (await (await json('GET', '/api/sessions', undefined, OTHER)).json()) as [];
    expect(sessions).toEqual([]);
    const dashboard = (await (
      await json('GET', '/api/dashboard', undefined, OTHER)
    ).json()) as Dashboard;
    expect(dashboard.periods.allTime.compak.count).toBe(0);
  });

  it("returns 404 when updating or deleting another user's session, and leaves it intact", async () => {
    const { json } = await createTestApp();
    const [ownerSession] = (await (await json('GET', '/api/sessions')).json()) as Session[];
    const id = ownerSession!.id;
    expect((await json('PUT', `/api/sessions/${id}`, newSession, OTHER)).status).toBe(404);
    expect((await json('DELETE', `/api/sessions/${id}`, undefined, OTHER)).status).toBe(404);
    const after = (await (await json('GET', '/api/sessions')).json()) as Session[];
    expect(after.find((s) => s.id === id)).toEqual(ownerSession);
  });

  it('stores new sessions under the signed-in user only', async () => {
    const { json } = await createTestApp();
    await json('POST', '/api/sessions', newSession, OTHER);
    const other = (await (await json('GET', '/api/sessions', undefined, OTHER)).json()) as [];
    expect(other).toHaveLength(1);
    const owner = (await (await json('GET', '/api/sessions')).json()) as [];
    expect(owner).toHaveLength(historyRows().length);
  });
});

describe('import', () => {
  it('is idempotent', async () => {
    const db = await createMemoryDb();
    await createProfilesRepo(db).create({ ...OWNER, emailVerified: true, image: null });
    const rows = historyRows();
    expect(await importHistory(db, rows, OWNER.id)).toBe(rows.length);
    expect(await importHistory(db, rows, OWNER.id)).toBe(0);
  });
});

// R11
describe('test-only endpoints', () => {
  it('/api/__test__/* do not exist outside E2E mode', async () => {
    const { json } = await createTestApp({ empty: true });
    expect((await json('POST', '/api/__test__/reset')).status).toBe(404);
    expect((await json('POST', '/api/__test__/token', OWNER)).status).toBe(404);
  });

  it('E2E mode and APP_NOW are ignored in production', () => {
    const config = loadConfig({ E2E: '1', APP_NOW: '2026-10-23', VERCEL_ENV: 'production' });
    expect(config.e2e).toBe(false);
    expect(config.appNow).toBeUndefined();
  });

  it('test routes are registered when E2E mode provides them, without auth', async () => {
    let calls = 0;
    const { app } = await createTestApp({
      empty: true,
      deps: {
        testRoutes: (a) =>
          a.post('/__test__/reset', (c) => {
            calls++;
            return c.json({ ok: true });
          }),
      },
    });
    expect((await app.request('/api/__test__/reset', { method: 'POST' })).status).toBe(200);
    expect(calls).toBe(1);
  });
});
