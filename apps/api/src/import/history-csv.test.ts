import { computeDashboard } from '@shooting-clays/shared';
import { describe, expect, it } from 'vitest';
import { historyRows } from '../test-utils';
import { parseCsvDate, parseHistoryCsv } from './history-csv';

describe('parseCsvDate', () => {
  it('converts DD-Mon-YYYY to ISO dates', () => {
    expect(parseCsvDate('26-Sep-2026')).toBe('2026-09-26');
    expect(parseCsvDate('3-Oct-2026')).toBe('2026-10-03');
  });

  it('rejects unknown formats', () => {
    expect(() => parseCsvDate('2026-09-26')).toThrow('Unrecognised date');
  });
});

describe('parseHistoryCsv', () => {
  const header =
    'Data,Modalidade,Resultado X/25,Gramas,Chumbo,Marca,Observações,Pratos mais exigentes\n';

  it('maps columns, joins notes, ignores N/A and handles multi-line fields', () => {
    const rows = parseHistoryCsv(
      header +
        '31-May-2026,Compak,20,24,7.5,Solognac,"Line one\nCampo A",Prato E\n' +
        '18-Jul-2026,Helices,4,24,7.5,Solognac,N/A,\n',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      date: '2026-05-31',
      discipline: 'compak',
      score: 20,
      notes: 'Line one\nCampo A\nPrato E',
    });
    expect(rows[1]).toMatchObject({ discipline: 'helice', notes: null });
  });

  it('gives identical rows at different positions different import keys', () => {
    const rows = parseHistoryCsv(header + '06-Sep-2026,Compak,17,28,7.5,S,,\n'.repeat(2));
    expect(rows[0]!.importKey).not.toBe(rows[1]!.importKey);
  });

  it('imports Trap rows as Fosso (decision #68)', () => {
    const rows = parseHistoryCsv(header + '06-Sep-2026,Trap,17,28,7.5,S,,\n');
    expect(rows.map((r) => [r.date, r.discipline])).toEqual([['2026-09-06', 'fosso']]);
  });

  it('rejects unknown disciplines', () => {
    expect(() => parseHistoryCsv(header + '06-Sep-2026,Skeet,17,28,7.5,S,,\n')).toThrow(
      'unknown discipline',
    );
  });
});

// R1 (unit level): the reference values in docs/testing.md.
describe('reference values (data/clays-results.csv, 2026-10-23)', () => {
  const { periods } = computeDashboard(historyRows(), '2026-10-23');
  const triple = (s: { avg: number | null; min: number | null; max: number | null }) =>
    s.avg === null ? '—' : `${s.avg} / ${s.min} / ${s.max}`;

  it.each([
    ['compak', '16 / 8 / 23', '18 / 14 / 23', '16 / 13 / 18'],
    ['fosso', '12 / 5 / 19', '10 / 5 / 16', '17 / 15 / 19'],
    ['helice', '4 / 4 / 4', '4 / 4 / 4', '—'],
  ] as const)('%s', (discipline, allTime, lastMonth, thisMonth) => {
    expect(triple(periods.allTime[discipline])).toBe(allTime);
    expect(triple(periods.lastMonth[discipline])).toBe(lastMonth);
    expect(triple(periods.thisMonth[discipline])).toBe(thisMonth);
  });
});
