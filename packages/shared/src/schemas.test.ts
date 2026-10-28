import { describe, expect, it } from 'vitest';
import { sessionInputSchema } from './schemas';

const valid = { date: '2026-10-23', discipline: 'compak', score: 16 };

describe('sessionInputSchema', () => {
  it('accepts a minimal session and applies defaults', () => {
    expect(sessionInputSchema.parse(valid)).toEqual({
      ...valid,
      hardestTargets: [],
      notes: null,
      clubId: null,
      fieldId: null,
    });
  });

  it.each([-1, 26, 12.5])('rejects score %s', (score) => {
    expect(sessionInputSchema.safeParse({ ...valid, score }).success).toBe(false);
  });

  it.each([0, 25])('accepts boundary score %s', (score) => {
    expect(sessionInputSchema.safeParse({ ...valid, score }).success).toBe(true);
  });

  it('rejects unknown disciplines and invalid dates', () => {
    expect(sessionInputSchema.safeParse({ ...valid, discipline: 'skeet' }).success).toBe(false);
    expect(sessionInputSchema.safeParse({ ...valid, date: '2026-02-30' }).success).toBe(false);
    expect(sessionInputSchema.safeParse({ ...valid, date: '23-10-2026' }).success).toBe(false);
  });

  it('sorts and de-duplicates hardest targets', () => {
    const parsed = sessionInputSchema.parse({ ...valid, hardestTargets: ['E', 'B', 'E'] });
    expect(parsed.hardestTargets).toEqual(['B', 'E']);
  });

  it('only allows hardest targets in Compak Sporting (decision #67)', () => {
    expect(sessionInputSchema.safeParse({ ...valid, hardestTargets: ['A'] }).success).toBe(true);
    for (const discipline of ['fosso', 'helice']) {
      expect(
        sessionInputSchema.safeParse({ ...valid, discipline, hardestTargets: ['A'] }).success,
      ).toBe(false);
    }
    expect(sessionInputSchema.safeParse({ ...valid, hardestTargets: ['G'] }).success).toBe(false);
  });

  it('trims notes, stores blank notes as null and limits length', () => {
    expect(sessionInputSchema.parse({ ...valid, notes: '  Field A ' }).notes).toBe('Field A');
    expect(sessionInputSchema.parse({ ...valid, notes: '   ' }).notes).toBeNull();
    expect(sessionInputSchema.safeParse({ ...valid, notes: 'x'.repeat(1001) }).success).toBe(false);
  });
});
