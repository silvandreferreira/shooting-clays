import { readFileSync } from 'node:fs';
import { createApp, type AppDeps } from './app';
import { createTestAuth, type AuthUser } from './auth';
import { createMemoryDb } from './db/client';
import { parseHistoryCsv, resetToHistory } from './import/history-csv';
import { HISTORY_CSV_PATH } from './runtime';

export const REFERENCE_NOW = new Date('2026-10-23T12:00:00Z');

export const historyRows = () => parseHistoryCsv(readFileSync(HISTORY_CSV_PATH, 'utf8'));

type TestUser = Pick<AuthUser, 'id' | 'email' | 'name'> & { emailVerified?: boolean };

/** Owner of the CSV history. */
export const OWNER: TestUser = { id: 'owner', email: 'owner@example.test', name: 'Test Owner' };
/** Another allowed user, to prove data isolation. */
export const OTHER: TestUser = { id: 'other', email: 'Other@Example.test', name: 'Other Shooter' };
/** Signed in with Google but not in ADMIN_EMAILS. */
export const STRANGER: TestUser = { id: 'stranger', email: 'stranger@example.test', name: 'X' };

export const ADMIN_EMAILS = ['owner@example.test', 'other@example.test'];

/** App on a fresh in-memory database; seeded with the CSV history for OWNER unless `empty`. */
export async function createTestApp({
  empty = false,
  deps = {},
}: { empty?: boolean; deps?: Partial<AppDeps> } = {}) {
  const db = await createMemoryDb();
  if (!empty) await resetToHistory(db, historyRows(), { id: OWNER.id, displayName: OWNER.name });
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
