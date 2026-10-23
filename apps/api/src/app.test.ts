import type { Dashboard, Session } from '@shooting-clays/shared';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import { loadConfig } from './config';
import { createMemoryDb } from './db/client';
import { importHistory } from './import/history-csv';
import { createTestApp, historyRows } from './test-utils';

const newSession = {
  date: '2026-10-23',
  discipline: 'compak',
  score: 25,
  hardestTargets: ['E', 'B'],
  notes: 'Field A',
};

describe('health', () => {
  it('GET /api/health answers without touching the database', async () => {
    const db = new Proxy({} as never, {
      get: () => {
        throw new Error('database accessed');
      },
    });
    const app = createApp({ db, now: () => new Date() });
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
    const res = await createApp({ db, now: () => new Date() }).request('/api/health/db');
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: { code: 'UNAVAILABLE' } });
  });
});

describe('GET /api/disciplines', () => {
  it('lists disciplines with their target-letter flag', async () => {
    const { app } = await createTestApp({ empty: true });
    const body = await (await app.request('/api/disciplines')).json();
    expect(body).toContainEqual({ key: 'compak', hasTargetLetters: true });
    expect(body).toContainEqual({ key: 'fosso', hasTargetLetters: false });
  });
});

describe('GET /api/dashboard', () => {
  it('returns the reference values for the imported history (R1)', async () => {
    const { app } = await createTestApp();
    const dashboard = (await (await app.request('/api/dashboard')).json()) as Dashboard;
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
    const { app } = await createTestApp();
    const all = (await (await app.request('/api/sessions')).json()) as Session[];
    expect(all).toHaveLength(historyRows().length);
    expect(all[0]!.date).toBe('2026-10-23');
    expect(all.at(-1)!.date).toBe('2026-04-12');

    const trap = (await (
      await app.request('/api/sessions?discipline=trap&from=2026-10-14&to=2026-10-31')
    ).json()) as Session[];
    expect(trap.map((s) => [s.date, s.score])).toEqual([
      ['2026-10-23', 18],
      ['2026-10-17', 19],
    ]);

    expect((await app.request('/api/sessions?discipline=skeet')).status).toBe(400);
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
    const db = {
      select: () => {
        throw new Error('boom: secret detail');
      },
    } as never;
    const captured: unknown[] = [];
    const app = createApp({ db, now: () => new Date(), captureException: (e) => captured.push(e) });
    const res = await app.request('/api/sessions');
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).toContain('INTERNAL_ERROR');
    expect(text).not.toContain('secret');
    expect(captured).toHaveLength(1);
  });
});

describe('import', () => {
  it('is idempotent', async () => {
    const db = await createMemoryDb();
    const rows = historyRows();
    expect(await importHistory(db, rows)).toBe(rows.length);
    expect(await importHistory(db, rows)).toBe(0);
  });
});

// R11
describe('test-only endpoints', () => {
  it('POST /api/__test__/reset does not exist outside E2E mode', async () => {
    const { json } = await createTestApp({ empty: true });
    expect((await json('POST', '/api/__test__/reset')).status).toBe(404);
  });

  it('E2E mode and APP_NOW are ignored in production', () => {
    const config = loadConfig({ E2E: '1', APP_NOW: '2026-10-23', VERCEL_ENV: 'production' });
    expect(config.e2e).toBe(false);
    expect(config.appNow).toBeUndefined();
  });

  it('POST /api/__test__/reset reseeds when E2E mode provides it', async () => {
    const { db } = await createTestApp({ empty: true });
    let resets = 0;
    const app = createApp({
      db,
      now: () => new Date(),
      resetForTests: async () => {
        resets++;
      },
    });
    expect((await app.request('/api/__test__/reset', { method: 'POST' })).status).toBe(200);
    expect(resets).toBe(1);
  });
});
