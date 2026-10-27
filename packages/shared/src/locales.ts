/** UI languages (BCP 47). See docs/roadmap.md → Iteration 6. */
export const LOCALES = ['en', 'pt-PT'] as const;
export type Locale = (typeof LOCALES)[number];
