import { z } from 'zod';
import { CLUBS, placeIssue } from './clubs';
import { CONTACT_LIMITS } from './contact';
import { LOCALES, type Locale } from './locales';
import {
  DISCIPLINE_KEYS,
  MAX_NOTES_LENGTH,
  MAX_SCORE,
  TARGET_LETTERS,
  hasTargetLetters,
} from './disciplines';

const optionalId = z
  .string({ error: 'must be a string' })
  .max(50)
  .nullish()
  .transform((id) => id || null);

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
    /** Where the series was shot (decision #66); empty or missing = not recorded. */
    clubId: optionalId,
    fieldId: optionalId,
  })
  .refine((s) => s.hardestTargets.length === 0 || hasTargetLetters(s.discipline), {
    error: 'hardestTargets are only allowed for compak',
    path: ['hardestTargets'],
  })
  .superRefine((s, ctx) => {
    const issue = placeIssue(s);
    if (issue) ctx.addIssue({ code: 'custom', message: issue.message, path: [issue.path] });
  });

/** A new series also says on which field it was shot; older ones may have none. */
export const newSessionInputSchema = sessionInputSchema.refine((s) => s.fieldId !== null, {
  error: 'fieldId is required',
  path: ['fieldId'],
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
    homeClubId: z
      .enum(
        CLUBS.map((c) => c.id),
        { error: `homeClubId must be one of: ${CLUBS.map((c) => c.id).join(', ')}` },
      )
      .nullable()
      .optional(),
  })
  .refine((p) => Object.values(p).some((value) => value !== undefined), {
    error: 'Nothing to update',
  });

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;

export const ROLES = ['user', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** pending: waiting for approval; active: can use the app; disabled: blocked by an admin. */
/**
 * `revoked`: an admin revoked the access and the user's data is gone; the account only remains
 * until the user reads the message (decision #65).
 */
export const ACCOUNT_STATUSES = ['pending', 'active', 'disabled', 'revoked'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** What an admin sets with the switch (and undo); `revoked` has its own endpoint. */
export const ADMIN_SETTABLE_STATUSES = ['pending', 'active', 'disabled'] as const;

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
  /** The club chosen first when adding a series; null = not chosen (the first club). */
  homeClubId: string | null;
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
  status: z.enum(ADMIN_SETTABLE_STATUSES, {
    error: 'status must be pending, active or disabled',
  }),
});

export type AdminUserUpdate = z.infer<typeof adminUserUpdateSchema>;

/**
 * The public contact form. `website` is a honeypot: hidden from people, so a value means a bot.
 * `locale` is the page's language (for the reply).
 */
export const contactInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { error: 'name is required' })
    .max(CONTACT_LIMITS.name, { error: `name must be at most ${CONTACT_LIMITS.name} characters` }),
  email: z.email({ error: 'email must be a valid email address' }).max(CONTACT_LIMITS.email, {
    error: `email must be at most ${CONTACT_LIMITS.email} characters`,
  }),
  message: z
    .string()
    .trim()
    .min(CONTACT_LIMITS.messageMin, {
      error: `message must be at least ${CONTACT_LIMITS.messageMin} characters`,
    })
    .max(CONTACT_LIMITS.message, {
      error: `message must be at most ${CONTACT_LIMITS.message} characters`,
    }),
  locale: z.enum(LOCALES, { error: 'locale must be en or pt-PT' }),
  website: z.string().max(200).optional(),
});
export type ContactInput = z.infer<typeof contactInputSchema>;

/**
 * In-app notifications (`GET /api/notifications`). Users get `registered`, `approved` and
 * `revoked`; admins get `signup` (a new account waiting for approval) and `contact` (a message
 * from the contact form).
 */
export const NOTIFICATION_KINDS = [
  'registered',
  'approved',
  'revoked',
  'signup',
  'contact',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export interface NotificationParams {
  registered: Record<string, never>;
  approved: Record<string, never>;
  revoked: { message: string };
  signup: { displayName: string };
  contact: { name: string; email: string; message: string };
}

export type AppNotification = {
  [K in NotificationKind]: {
    id: string;
    kind: K;
    params: NotificationParams[K];
    createdAt: string;
    readAt: string | null;
  };
}[NotificationKind];

export interface NotificationList {
  items: AppNotification[];
  unread: number;
}

export const MAX_REVOKE_MESSAGE_LENGTH = 1000;

export const revokeInputSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, { error: 'message is required' })
    .max(MAX_REVOKE_MESSAGE_LENGTH, {
      error: `message must be at most ${MAX_REVOKE_MESSAGE_LENGTH} characters`,
    }),
});
export type RevokeInput = z.infer<typeof revokeInputSchema>;
