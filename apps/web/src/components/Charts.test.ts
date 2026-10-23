import { describe, expect, it } from 'vitest';
import { toScoreRows } from './Charts';

describe('toScoreRows', () => {
  it('merges disciplines by date and averages same-day scores', () => {
    expect(
      toScoreRows({
        compak: [
          { date: '2026-10-23', score: 13 },
          { date: '2026-10-23', score: 16 },
        ],
        trap: [
          { date: '2026-10-17', score: 19 },
          { date: '2026-10-23', score: 18 },
        ],
      }),
    ).toEqual([
      { date: '2026-10-17', trap: 19 },
      { date: '2026-10-23', compak: 14.5, trap: 18 },
    ]);
  });
});
