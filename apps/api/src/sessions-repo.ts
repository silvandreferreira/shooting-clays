import {
  computeDashboard,
  type DisciplineKey,
  type Session,
  type SessionData,
  type SessionsQuery,
} from '@shooting-clays/shared';
import { and, asc, desc, eq, gte, lte } from 'drizzle-orm';
import type { Db } from './db/client';
import { sessions, type SessionRow } from './db/schema';

export function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    date: row.date,
    discipline: row.discipline as DisciplineKey,
    score: row.score,
    hardestTargets: row.hardestTargets as Session['hardestTargets'],
    notes: row.notes,
    clubId: row.clubId,
    fieldId: row.fieldId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function createSessionsRepo(db: Db) {
  return {
    async list(userId: string, query: SessionsQuery = {}): Promise<Session[]> {
      const rows = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, userId),
            query.from ? gte(sessions.date, query.from) : undefined,
            query.to ? lte(sessions.date, query.to) : undefined,
            query.discipline ? eq(sessions.discipline, query.discipline) : undefined,
          ),
        )
        .orderBy(desc(sessions.date), desc(sessions.createdAt));
      return rows.map(toSession);
    },

    async create(userId: string, data: SessionData): Promise<Session> {
      const [row] = await db
        .insert(sessions)
        .values({ userId, ...data })
        .returning();
      return toSession(row!);
    },

    async update(userId: string, id: string, data: SessionData): Promise<Session | undefined> {
      const [row] = await db
        .update(sessions)
        .set(data)
        .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
        .returning();
      return row && toSession(row);
    },

    async remove(userId: string, id: string): Promise<boolean> {
      const rows = await db
        .delete(sessions)
        .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
        .returning({ id: sessions.id });
      return rows.length > 0;
    },

    async dashboard(userId: string, referenceDate: string) {
      const rows = await db
        .select({
          date: sessions.date,
          discipline: sessions.discipline,
          score: sessions.score,
          clubId: sessions.clubId,
          fieldId: sessions.fieldId,
        })
        .from(sessions)
        .where(eq(sessions.userId, userId))
        // Imported series share created_at: the id keeps their order stable between requests.
        .orderBy(asc(sessions.date), asc(sessions.createdAt), asc(sessions.id));
      return computeDashboard(
        rows.map((r) => ({ ...r, discipline: r.discipline as DisciplineKey })),
        referenceDate,
      );
    },
  };
}

export type SessionsRepo = ReturnType<typeof createSessionsRepo>;
