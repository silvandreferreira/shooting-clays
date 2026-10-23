import { readFileSync } from 'node:fs';
import { createApp, type AppDeps } from './app';
import { createTestAuth, type AuthUser } from './auth';
import { createMemoryDb, upsertAuthUser } from './db/memory';
import { profiles } from './db/schema';
import { HISTORY_CSV_PATH, parseHistoryCsv, resetToHistory } from './import/history-csv';

export const REFERENCE_NOW = new Date('2026-10-23T12:00:00Z');

export const historyRows = () => parseHistoryCsv(readFileSync(HISTORY_CSV_PATH, 'utf8'));

type TestUser = Pick<AuthUser, 'id' | 'email' | 'name'> & { emailVerified?: boolean };

/** Owner of the CSV history and admin (in ADMIN_EMAILS). */
export const OWNER: TestUser = { id: 'owner', email: 'owner@example.test', name: 'Test Owner' };
/** An approved (active) user, to prove data isolation. */
export const OTHER: TestUser = { id: 'other', email: 'other@example.test', name: 'Other Shooter' };
/** Signed in with Google for the first time: no profile yet, so pending. */
export const NEWCOMER: TestUser = { id: 'newcomer', email: 'new@example.test', name: 'New Comer' };

export const ADMIN_EMAILS = ['owner@example.test'];

/**
 * App on a fresh in-memory database. The three users exist in (fake) Neon Auth and OTHER is
 * active; the CSV history is seeded for OWNER unless `empty`.
 */
export async function createTestApp({
  empty = false,
  deps = {},
}: { empty?: boolean; deps?: Partial<AppDeps> } = {}) {
  const db = await createMemoryDb();
  // Signed up in this order (the admin list sorts by sign-up date).
  for (const [user, createdAt] of [
    [OWNER, '2026-01-01'],
    [OTHER, '2026-02-01'],
    [NEWCOMER, '2026-03-01'],
  ] as const) {
    await upsertAuthUser(db, { ...user, createdAt: new Date(createdAt) });
  }
  if (!empty) await resetToHistory(db, historyRows(), { id: OWNER.id, displayName: OWNER.name });
  await db.insert(profiles).values({ userId: OTHER.id, displayName: OTHER.name, status: 'active' });
  const testAuth = await createTestAuth();
  const app = createApp({
    db,
    now: () => REFERENCE_NOW,
    verifyToken: testAuth.verifyToken,
    adminEmails: ADMIN_EMAILS,
    ...deps,
  });
  const json = async (method: string, path: string, body?: unknown, as: TestUser | null = OWNER) =>
    app.request(path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(as ? { Authorization: `Bearer ${await testAuth.signToken(as)}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { app, db, json, testAuth };
}
