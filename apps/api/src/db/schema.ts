import { sql } from 'drizzle-orm';
import { check, index, pgTable, smallint, text, timestamp, uuid, date } from 'drizzle-orm/pg-core';

export const profiles = pgTable('profiles', {
  userId: text('user_id').primaryKey(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ProfileRow = typeof profiles.$inferSelect;

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    date: date('date', { mode: 'string' }).notNull(),
    discipline: text('discipline').notNull(),
    score: smallint('score').notNull(),
    hardestTargets: text('hardest_targets')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    notes: text('notes'),
    importKey: text('import_key').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('sessions_user_id_date_idx').on(t.userId, t.date),
    check('sessions_score_range', sql`${t.score} between 0 and 25`),
  ],
);

export type SessionRow = typeof sessions.$inferSelect;
