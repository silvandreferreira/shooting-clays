// Imports data/clays-results.csv into the database in DATABASE_URL. Safe to re-run.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createNeonDb } from '../src/db/client';
import { importHistory, parseHistoryCsv } from '../src/import/history-csv';
import { HISTORY_CSV_PATH } from '../src/runtime';

try {
  process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url)));
} catch {
  // No .env file: rely on the environment.
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not defined');

const rows = parseHistoryCsv(await readFile(HISTORY_CSV_PATH, 'utf8'));
const inserted = await importHistory(createNeonDb(url), rows);
console.log(
  `Read ${rows.length} rows; inserted ${inserted}, skipped ${rows.length - inserted} already imported.`,
);
