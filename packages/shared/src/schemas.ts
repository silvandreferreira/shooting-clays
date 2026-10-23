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
