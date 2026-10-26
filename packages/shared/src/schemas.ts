import { z } from 'zod';
import {
  DISCIPLINE_KEYS,
  MAX_NOTES_LENGTH,
  MAX_SCORE,
  TARGET_LETTERS,
  hasTargetLetters,
} from './disciplines';

export const isoDateSchema = z.iso.date({ error: 'date must be a valid YYYY-MM-DD date' });

export const disciplineSchema = z.enum(DISCIPLINE_KEYS, {
  error: `discipline must be one of: ${DISCIPLINE_KEYS.join(', ')}`,
});

export const sessionInputSchema = z
  .object({
    date: isoDateSchema,
    discipline: disciplineSchema,
    score: z
      .number({ error: 'score must be a number' })
      .int({ error: 'score must be a whole number' })
      .min(0, { error: `score must be between 0 and ${MAX_SCORE}` })
      .max(MAX_SCORE, { error: `score must be between 0 and ${MAX_SCORE}` }),
    hardestTargets: z
      .array(z.enum(TARGET_LETTERS, { error: 'hardestTargets may only contain A–F' }))
      .default([])
      .transform((letters) => TARGET_LETTERS.filter((l) => letters.includes(l))),
    notes: z
      .string()
      .max(MAX_NOTES_LENGTH, { error: `notes must be at most ${MAX_NOTES_LENGTH} characters` })
      .nullish()
      .transform((notes) => (notes?.trim() ? notes.trim() : null)),
  })
  .refine((s) => s.hardestTargets.length === 0 || hasTargetLetters(s.discipline), {
    error: 'hardestTargets are only allowed for disciplines with lettered targets',
    path: ['hardestTargets'],
  });

/** What the client sends (before defaults/transforms). */
export type SessionInput = z.input<typeof sessionInputSchema>;
/** What the API stores (after defaults/transforms). */
export type SessionData = z.output<typeof sessionInputSchema>;

export const sessionsQuerySchema = z.object({
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
  discipline: disciplineSchema.optional(),
});

export type SessionsQuery = z.infer<typeof sessionsQuerySchema>;

export interface Session extends SessionData {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export const MAX_DISPLAY_NAME_LENGTH = 50;

/** UI languages (BCP 47). See docs/roadmap.md → Iteration 6. */
export const LOCALES = ['en', 'pt-PT'] as const;
export type Locale = (typeof LOCALES)[number];

export const profileUpdateSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, { error: 'displayName is required' })
      .max(MAX_DISPLAY_NAME_LENGTH, {
        error: `displayName must be at most ${MAX_DISPLAY_NAME_LENGTH} characters`,
      })
      .optional(),
    showInCommunity: z.boolean({ error: 'showInCommunity must be true or false' }).optional(),
    locale: z.enum(LOCALES, { error: 'locale must be en or pt-PT' }).optional(),
  })
  .refine((p) => Object.values(p).some((value) => value !== undefined), {
    error: 'Nothing to update',
  });

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export const ROLES = ['user', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** pending: waiting for approval; active: can use the app; disabled: blocked by an admin. */
export const ACCOUNT_STATUSES = ['pending', 'active', 'disabled'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** The signed-in user (`GET /api/me`). `email` is only ever returned to its owner. */
export interface Me {
  displayName: string;
  avatarUrl: string | null;
  email: string;
  role: Role;
  status: AccountStatus;
  /** Listed on the Community leaderboards (opt-out, on by default). */
  showInCommunity: boolean;
  /** Chosen UI language; null = not chosen yet (follow the browser). */
  locale: Locale | null;
}

/** A row of the admin's user list (`GET /api/admin/users`). */
export interface AdminUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  email: string | null;
  role: Role;
  status: AccountStatus;
  signedUpAt: string;
  sessionCount: number;
  lastActivityAt: string | null;
}

export const adminUserUpdateSchema = z.object({
  status: z.enum(ACCOUNT_STATUSES, { error: 'status must be pending, active or disabled' }),
});

export type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>;
