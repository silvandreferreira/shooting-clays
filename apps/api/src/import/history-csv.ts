import type { DisciplineKey } from '@shooting-clays/shared';
import { parse } from 'csv-parse/sync';
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { notifications, profiles, sessions } from '../db/schema';

/** The owner's history before the app existed (see docs/data-model.md → Import). */
export const HISTORY_CSV_PATH = new URL('../../../../data/clays-results.csv', import.meta.url);

export interface HistoryRow {
  date: string;
  discipline: DisciplineKey;
  score: number;
  notes: string | null;
  /** The whole history was shot at CCM; the field was not recorded. */
  clubId: string;
  importKey: string;
}

export const HISTORY_CLUB_ID = 'ccm';

/** Recorded before the app kept only three disciplines; skipped (decision #68). */
const DISCARDED = new Set(['Trap']);

const DISCIPLINE_MAP: Record<string, DisciplineKey> = {
  Compak: 'compak',
  Fosso: 'fosso',
  Helices: 'helice',
};

const MONTHS: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
};

/** "26-Sep-2026" → "2026-09-26" */
export function parseCsvDate(value: string): string {
  const match = /^(\d{1,2})-([A-Z][a-z]{2})-(\d{4})$/.exec(value.trim());
  const month = match && MONTHS[match[2]!];
  if (!match || !month) throw new Error(`Unrecognised date: "${value}"`);
  return `${match[3]}-${month}-${match[1]!.padStart(2, '0')}`;
}

function cleanNote(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed !== 'N/A' ? trimmed : null;
}

/** Parses data/clays-results.csv into session rows (see docs/data-model.md → Import). */
export function parseHistoryCsv(text: string): HistoryRow[] {
  const records = parse(text, { columns: true, skip_empty_lines: true, bom: true }) as Record<
    string,
    string
  >[];
  return records.flatMap((record, index) => {
    const date = parseCsvDate(record['Data'] ?? '');
    const modality = (record['Modalidade'] ?? '').trim();
    if (DISCARDED.has(modality)) return [];
    const discipline = DISCIPLINE_MAP[modality];
    if (!discipline) throw new Error(`Row ${index + 2}: unknown discipline "${modality}"`);
    const score = Number(record['Resultado X/25']);
    if (!Number.isInteger(score) || score < 0 || score > 25) {
      throw new Error(`Row ${index + 2}: invalid score "${record['Resultado X/25']}"`);
    }
    const noteParts = [
      cleanNote(record['Observações']),
      cleanNote(record['Pratos mais exigentes']),
    ];
    const notes = noteParts.filter(Boolean).join('\n') || null;
    const importKey = createHash('sha256')
      .update(`${date}|${discipline}|${score}|${index}`)
      .digest('hex');
    return { date, discipline, score, notes, clubId: HISTORY_CLUB_ID, importKey };
  });
}

/**
 * Inserts the rows for `userId` (whose profile must exist); rows already imported (same
 * import_key) are skipped. Returns rows inserted.
 */
export async function importHistory(db: Db, rows: HistoryRow[], userId: string) {
  if (rows.length === 0) return 0;
  const inserted = await db
    .insert(sessions)
    .values(rows.map((r) => ({ ...r, userId })))
    .onConflictDoNothing({ target: sessions.importKey })
    .returning({ id: sessions.id });
  return inserted.length;
}

/**
 * Tests and E2E only: empties the tables and imports the history for the given owner, an active
 * admin.
 */
export async function resetToHistory(
  db: Db,
  rows: HistoryRow[],
  owner: { id: string; displayName: string },
) {
  await db.execute(sql`truncate table ${notifications}, ${sessions}, ${profiles}`);
  await db
    .insert(profiles)
    .values({ userId: owner.id, displayName: owner.displayName, role: 'admin', status: 'active' });
  return importHistory(db, rows, owner.id);
}
