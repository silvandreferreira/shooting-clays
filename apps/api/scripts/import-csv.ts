// Imports data/clays-results.csv for the owner into the database in DATABASE_URL. Safe to re-run.
import { readFile } from 'node:fs/promises';
import { HISTORY_CSV_PATH, importHistory, parseHistoryCsv } from '../src/import/history-csv';
import { findOwner, loadScriptEnv } from './owner';

const { db, host } = loadScriptEnv();
const owner = await findOwner(db);
const rows = parseHistoryCsv(await readFile(HISTORY_CSV_PATH, 'utf8'));
const inserted = await importHistory(db, rows, owner.id);
console.log(
  `${host}: read ${rows.length} rows; inserted ${inserted}, skipped ${rows.length - inserted} already imported.`,
);
