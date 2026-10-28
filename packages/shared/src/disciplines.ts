export const DISCIPLINE_KEYS = ['compak', 'sporting', 'fosso', 'trap', 'helice'] as const;

export type DisciplineKey = (typeof DISCIPLINE_KEYS)[number];

export interface Discipline {
  key: DisciplineKey;
  /**
   * Whether "hardest targets" (A–F) can be recorded: Compak Sporting only, at the owner's request
   * (decision #67).
   */
  hasTargetLetters: boolean;
}

export const DISCIPLINES: readonly Discipline[] = [
  { key: 'compak', hasTargetLetters: true },
  { key: 'sporting', hasTargetLetters: false },
  { key: 'fosso', hasTargetLetters: false },
  { key: 'trap', hasTargetLetters: false },
  { key: 'helice', hasTargetLetters: false },
];

export const TARGET_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

export type TargetLetter = (typeof TARGET_LETTERS)[number];

export const MAX_SCORE = 25;

export const MAX_NOTES_LENGTH = 1000;

export function hasTargetLetters(key: DisciplineKey): boolean {
  return DISCIPLINES.some((d) => d.key === key && d.hasTargetLetters);
}
