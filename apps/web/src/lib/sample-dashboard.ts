import {
  computeDashboard,
  todayInLisbon,
  type Dashboard,
  type DisciplineKey,
  type ScoredSession,
} from '@shooting-clays/shared';

/** [days before today, discipline, score]: a plausible few months at the range. */
const SAMPLE: [number, DisciplineKey, number][] = [
  [86, 'compak', 11],
  [79, 'compak', 13],
  [72, 'helice', 6],
  [65, 'compak', 12],
  [58, 'fosso', 9],
  [51, 'compak', 15],
  [44, 'fosso', 11],
  [37, 'compak', 14],
  [33, 'fosso', 12],
  [30, 'compak', 17],
  [23, 'helice', 9],
  [16, 'compak', 16],
  [12, 'fosso', 14],
  [9, 'compak', 19],
  [5, 'fosso', 15],
  [2, 'compak', 18],
];

function daysBefore(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/**
 * The dashboard a pending user sees: sample data built in the front end (no API call), dated
 * relative to today so every period has something to show.
 */
export function sampleDashboard(now = new Date()): Dashboard {
  const today = todayInLisbon(now);
  const sessions: ScoredSession[] = SAMPLE.map(([days, discipline, score]) => ({
    date: daysBefore(today, days),
    discipline,
    score,
  }));
  return computeDashboard(sessions, today);
}
