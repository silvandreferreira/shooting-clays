import { readFileSync } from 'node:fs';
import { createApp } from './app';
import { createMemoryDb } from './db/client';
import { parseHistoryCsv, resetToHistory } from './import/history-csv';
import { HISTORY_CSV_PATH } from './runtime';

export const REFERENCE_NOW = new Date('2026-10-23T12:00:00Z');

export const historyRows = () => parseHistoryCsv(readFileSync(HISTORY_CSV_PATH, 'utf8'));

/** App backed by a fresh in-memory database; seeded with the CSV history unless `empty`. */
export async function createTestApp({ empty = false } = {}) {
  const db = await createMemoryDb();
  if (!empty) await resetToHistory(db, historyRows());
  const app = createApp({ db, now: () => REFERENCE_NOW });
  const json = (method: string, path: string, body?: unknown) =>
    app.request(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return { app, db, json };
}
