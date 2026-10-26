import { z } from 'zod';
import { MAX_SCORE } from './disciplines';
import { disciplineSchema, isoDateSchema } from './schemas';
import type { DisciplineKey } from './disciplines';

/** Leaderboard periods (docs/roadmap.md → Iteration 4). Month is the default. */
export const COMMUNITY_PERIODS = ['day', 'week', 'month'] as const;
export type CommunityPeriod = (typeof COMMUNITY_PERIODS)[number];

export const leaderboardQuerySchema = z.object({
  discipline: disciplineSchema,
  period: z
    .enum(COMMUNITY_PERIODS, { error: 'period must be day, week or month' })
    .default('month'),
  /** Any day inside the period; the API uses today (Europe/Lisbon) when it is missing. */
  date: isoDateSchema.optional(),
});

export type LeaderboardQuery = z.input<typeof leaderboardQuerySchema>;

/** One shooter on a leaderboard. No user id or email ever leaves the API. */
export interface LeaderboardEntry {
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  bestScore: number;
  /** How many series reached `bestScore` in the period. */
  bestScoreCount: number;
  series: number;
  isMe: boolean;
}

export interface Leaderboard {
  discipline: DisciplineKey;
  period: CommunityPeriod;
  /** First and last day of the period (YYYY-MM-DD, inclusive). */
  from: string;
  to: string;
  entries: LeaderboardEntry[];
  /** The signed-in user switched "Show me in the Community" off. */
  meHidden: boolean;
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);
const toIso = (date: Date) => date.toISOString().slice(0, 10);

function addDays(iso: string, days: number): string {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

/**
 * First and last day of the period containing `date`. Dates are calendar days in Europe/Lisbon
 * already, so this is plain calendar arithmetic. Weeks run Sunday to Saturday.
 */
export function periodBounds(period: CommunityPeriod, date: string): { from: string; to: string } {
  if (period === 'day') return { from: date, to: date };
  if (period === 'week') {
    // getUTCDay() is 0 on Sunday, the first day of the week.
    const from = addDays(date, -toDate(date).getUTCDay());
    return { from, to: addDays(from, 6) };
  }
  const from = `${date.slice(0, 7)}-01`;
  const next = toDate(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { from, to: addDays(toIso(next), -1) };
}

/** A day inside the period just before (`step` -1) or after (+1) the one containing `date`. */
export function shiftPeriod(period: CommunityPeriod, date: string, step: -1 | 1): string {
  const { from, to } = periodBounds(period, date);
  return step < 0 ? addDays(from, -1) : addDays(to, 1);
}

/** One series of a shooter in the period and discipline being ranked. */
export interface RankableSeries {
  score: number;
  date: string;
  /** Tie-break between series on the same day (ISO timestamp). */
  createdAt: string;
}

export interface RankableShooter {
  displayName: string;
  avatarUrl: string | null;
  isMe: boolean;
  series: RankableSeries[];
}

interface Scored {
  shooter: RankableShooter;
  /** counts[i] = number of series at MAX_SCORE - i. */
  counts: number[];
  /** When the shooter first reached their best score ("date createdAt", sortable). */
  reachedBestAt: string;
}

function compareCounts(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return b[i]! - a[i]!;
  }
  return 0;
}

/**
 * Ranks shooters (docs/roadmap.md → Iteration 4): more series at 25 first, then at 24, and so on
 * down to 0; the first score where the counts differ decides. Shooters with the same count at
 * every score share a rank (1, 1, 3) and are listed by who reached their best score first.
 */
export function rankShooters(shooters: RankableShooter[]): LeaderboardEntry[] {
  const scored: Scored[] = shooters
    .filter((s) => s.series.length > 0)
    .map((shooter) => {
      const counts = Array.from({ length: MAX_SCORE + 1 }, () => 0);
      for (const { score } of shooter.series) counts[MAX_SCORE - score]! += 1;
      const best = MAX_SCORE - counts.findIndex((n) => n > 0);
      const reachedBestAt = shooter.series
        .filter((s) => s.score === best)
        .map((s) => `${s.date} ${s.createdAt}`)
        .sort()[0]!;
      return { shooter, counts, reachedBestAt };
    });

  scored.sort(
    (a, b) =>
      compareCounts(a.counts, b.counts) ||
      (a.reachedBestAt < b.reachedBestAt ? -1 : a.reachedBestAt > b.reachedBestAt ? 1 : 0),
  );

  let rank = 0;
  return scored.map(({ shooter, counts }, index) => {
    // Same counts as the shooter above → same rank (standard competition ranking).
    if (index === 0 || compareCounts(scored[index - 1]!.counts, counts) !== 0) rank = index + 1;
    const bestIndex = counts.findIndex((n) => n > 0);
    return {
      rank,
      displayName: shooter.displayName,
      avatarUrl: shooter.avatarUrl,
      bestScore: MAX_SCORE - bestIndex,
      bestScoreCount: counts[bestIndex]!,
      series: shooter.series.length,
      isMe: shooter.isMe,
    };
  });
}
