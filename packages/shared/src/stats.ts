import { DISCIPLINE_KEYS, type DisciplineKey } from './disciplines';

export const TIME_ZONE = 'Europe/Lisbon';

export const PERIODS = ['allTime', 'lastMonth', 'thisMonth'] as const;

export type Period = (typeof PERIODS)[number];

export interface PeriodStats {
  /** Rounded to the nearest integer; null when there are no sessions. */
  avg: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

export interface SeriesPoint {
  date: string;
  score: number;
}

export interface Dashboard {
  referenceDate: string;
  periods: Record<Period, Record<DisciplineKey, PeriodStats>>;
  /** Every score per discipline, oldest first (ties keep creation order). */
  series: Record<DisciplineKey, SeriesPoint[]>;
}

export interface ScoredSession {
  date: string;
  discipline: DisciplineKey;
  score: number;
}

/** Today's date (YYYY-MM-DD) in Europe/Lisbon. */
export function todayInLisbon(now: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** The YYYY-MM month before the given YYYY-MM. */
export function previousMonth(month: string): string {
  const [year, m] = month.split('-').map(Number) as [number, number];
  return m === 1 ? `${year - 1}-12` : `${year}-${String(m - 1).padStart(2, '0')}`;
}

/** Which periods a session date falls into, relative to the reference date. */
export function periodsForDate(date: string, referenceDate: string): Period[] {
  const thisMonth = referenceDate.slice(0, 7);
  const month = date.slice(0, 7);
  const periods: Period[] = ['allTime'];
  if (month === thisMonth) periods.push('thisMonth');
  if (month === previousMonth(thisMonth)) periods.push('lastMonth');
  return periods;
}

export function computeStats(scores: number[]): PeriodStats {
  if (scores.length === 0) return { avg: null, min: null, max: null, count: 0 };
  const sum = scores.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round(sum / scores.length),
    min: Math.min(...scores),
    max: Math.max(...scores),
    count: scores.length,
  };
}

function byDiscipline<T>(make: () => T): Record<DisciplineKey, T> {
  return Object.fromEntries(DISCIPLINE_KEYS.map((k) => [k, make()])) as Record<DisciplineKey, T>;
}

/**
 * Dashboard statistics per discipline and period. Deterministic: the reference date
 * (YYYY-MM-DD, Europe/Lisbon) is a parameter, never read from the clock.
 */
export function computeDashboard(sessions: ScoredSession[], referenceDate: string): Dashboard {
  const scores = Object.fromEntries(
    PERIODS.map((p) => [p, byDiscipline<number[]>(() => [])]),
  ) as Record<Period, Record<DisciplineKey, number[]>>;
  const series = byDiscipline<SeriesPoint[]>(() => []);

  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  for (const s of sorted) {
    for (const period of periodsForDate(s.date, referenceDate)) {
      scores[period][s.discipline].push(s.score);
    }
    series[s.discipline].push({ date: s.date, score: s.score });
  }

  const periods = Object.fromEntries(
    PERIODS.map((p) => [
      p,
      Object.fromEntries(DISCIPLINE_KEYS.map((k) => [k, computeStats(scores[p][k])])),
    ]),
  ) as Dashboard['periods'];

  return { referenceDate, periods, series };
}

/** Time ranges of the "Scores over time" chart (docs/roadmap.md → Iteration 5). */
export const CHART_RANGES = ['3m', '6m', '1y', 'all'] as const;

export type ChartRange = (typeof CHART_RANGES)[number];

export const DEFAULT_CHART_RANGE: ChartRange = '3m';

const RANGE_MONTHS: Record<Exclude<ChartRange, 'all'>, number> = { '3m': 3, '6m': 6, '1y': 12 };

/**
 * First day (inclusive) of a rolling range ending on the reference date, or null for all time.
 * 2026-10-23 − 3 months = 2026-07-23; when that month is shorter, its last day (05-31 → 02-28).
 */
export function chartRangeStart(range: ChartRange, referenceDate: string): string | null {
  if (range === 'all') return null;
  const [year, month, day] = referenceDate.split('-').map(Number) as [number, number, number];
  const total = year * 12 + (month - 1) - RANGE_MONTHS[range];
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${y}-${String(m).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}
