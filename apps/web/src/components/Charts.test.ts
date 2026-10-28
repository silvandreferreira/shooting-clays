import { describe, expect, it } from 'vitest';
import { toScoreRows } from './Charts';

describe('toScoreRows', () => {
  it('keeps every series: two on the same day are two points, never an average', () => {
    expect(
      toScoreRows({
        compak: [
          { date: '2026-10-23', score: 13 },
          { date: '2026-10-23', score: 16 },
        ],
        fosso: [
          { date: '2026-10-17', score: 19 },
          { date: '2026-10-23', score: 18 },
        ],
      }),
    ).toEqual([
      { key: '2026-10-17#0', date: '2026-10-17', fosso: 19 },
      { key: '2026-10-23#0', date: '2026-10-23', compak: 13, fosso: 18 },
      { key: '2026-10-23#1', date: '2026-10-23', compak: 16 },
    ]);
  });
});
