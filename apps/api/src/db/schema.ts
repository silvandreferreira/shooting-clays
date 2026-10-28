import { ACCOUNT_STATUSES, LOCALES, NOTIFICATION_KINDS, ROLES } from '@shooting-clays/shared';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const profiles = pgTable(
  'profiles',
  {
    userId: text('user_id').primaryKey(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    role: text('role', { enum: ROLES }).notNull().default('user'),
    status: text('status', { enum: ACCOUNT_STATUSES }).notNull().default('pending'),
    /** Set whenever an admin changes the status. */
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
    /** Listed on the Community leaderboards; opt-out (decision #53). */
    showInCommunity: boolean('show_in_community').notNull().default(true),
    /** UI language; null = follow the browser (iteration 6). */
    locale: text('locale', { enum: LOCALES }),
    /** Club chosen first when adding a series (an id from CLUBS); null = the first club. */
    homeClubId: text('home_club_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    check('profiles_role_values', sql`${t.role} in ('user', 'admin')`),
    check(
      'profiles_status_values',
      sql`${t.status} in ('pending', 'active', 'disabled', 'revoked')`,
    ),
    check('profiles_locale_values', sql`${t.locale} in ('en', 'pt-PT')`),
  ],
);

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
    /**
     * Where the series was shot: ids from CLUBS (packages/shared/src/clubs.ts, decision #66);
     * null on series logged before clubs existed.
     */
    clubId: text('club_id'),
    fieldId: text('field_id'),
    importKey: text('import_key').unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('sessions_user_id_date_idx').on(t.userId, t.date),
    index('sessions_discipline_date_idx').on(t.discipline, t.date),
    check('sessions_score_range', sql`${t.score} between 0 and 25`),
    check('sessions_discipline_values', sql`${t.discipline} in ('compak', 'fosso', 'helice')`),
    check('sessions_field_needs_club', sql`${t.fieldId} is null or ${t.clubId} is not null`),
  ],
);

export type SessionRow = typeof sessions.$inferSelect;

/**
 * In-app notifications (decision #65): one row per recipient. `kind` says what happened and the
 * app renders it in the reader's language; `params` holds what the text needs.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    kind: text('kind', { enum: NOTIFICATION_KINDS }).notNull(),
    params: jsonb('params').$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => [
    index('notifications_user_id_created_at_idx').on(t.userId, t.createdAt),
    check(
      'notifications_kind_values',
      sql`${t.kind} in ('registered', 'approved', 'revoked', 'signup', 'contact')`,
    ),
  ],
);

export type NotificationRow = typeof notifications.$inferSelect;
