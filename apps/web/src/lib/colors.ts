import type { DisciplineKey } from '@shooting-clays/shared';

/** Fixed colour per discipline (validated categorical palette, slots 1–5). */
export const disciplineColor = (key: DisciplineKey) => `var(--series-${key})`;
