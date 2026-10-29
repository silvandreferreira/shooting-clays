import {
  periodBounds,
  rankShooters,
  type LeaderboardPeriod,
  type AccountStatus,
  type DisciplineKey,
  type Leaderboard,
  type RankableShooter,
} from '@shooting-clays/shared';
import { and, asc, eq, gte, lte, sql } from 'drizzle-orm';
import type { Db } from './db/client';
import { profiles, sessions } from './db/schema';

export function createCommunityRepo(db: Db) {
  return {
    /**
     * Ranked shooters for one club, discipline and month or year, and optionally one field
     * (decisions #71 and #73).
     * Only active accounts that did not switch "Show me in the Community" off take part
     * (docs/roadmap.md → Iteration 4).
     */
    async leaderboard(
      meId: string,
      meHidden: boolean,
      query: {
        clubId: string;
        discipline: DisciplineKey;
        fieldId?: string;
        period: LeaderboardPeriod;
        date: string;
      },
    ): Promise<Leaderboard> {
      const { from, to } = periodBounds(query.period, query.date);
      const rows = await db
        .select({
          userId: sessions.userId,
          displayName: profiles.displayName,
          // The current Google photo lives in Neon Auth; the profile keeps the one from sign-up.
          avatarUrl: sql<string | null>`coalesce(
            (select u.image from neon_auth."user" u where u.id::text = ${profiles.userId}),
            ${profiles.avatarUrl})`,
          score: sessions.score,
          date: sessions.date,
          createdAt: sessions.createdAt,
        })
        .from(sessions)
        .innerJoin(profiles, eq(profiles.userId, sessions.userId))
        .where(
          and(
            eq(sessions.clubId, query.clubId),
            eq(sessions.discipline, query.discipline),
            query.fieldId === undefined ? undefined : eq(sessions.fieldId, query.fieldId),
            gte(sessions.date, from),
            lte(sessions.date, to),
            eq(profiles.status, 'active' satisfies AccountStatus),
            eq(profiles.showInCommunity, true),
          ),
        )
        .orderBy(asc(sessions.userId));

      const shooters = new Map<string, RankableShooter>();
      for (const row of rows) {
        let shooter = shooters.get(row.userId);
        if (!shooter) {
          shooter = {
            displayName: row.displayName,
            avatarUrl: row.avatarUrl,
            isMe: row.userId === meId,
            series: [],
          };
          shooters.set(row.userId, shooter);
        }
        shooter.series.push({
          score: row.score,
          date: row.date,
          createdAt: row.createdAt.toISOString(),
        });
      }

      return {
        clubId: query.clubId,
        discipline: query.discipline,
        fieldId: query.fieldId ?? null,
        period: query.period,
        from,
        to,
        entries: rankShooters([...shooters.values()]),
        meHidden,
      };
    },
  };
}
