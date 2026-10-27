/**
 * Limits of the public contact form (`POST /api/contact`). Kept apart from the Zod schema so the
 * public site can use them without loading Zod.
 */
export const CONTACT_LIMITS = {
  name: 100,
  email: 254,
  messageMin: 10,
  message: 5000,
} as const;
