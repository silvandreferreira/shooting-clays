import { describe, expect, it } from 'vitest';
import {
  leaderboardQuerySchema,
  monthBounds,
  rankShooters,
  shiftMonth,
  type RankableShooter,
} from './community';
import { profileUpdateSchema } from './schemas';

let clock = 0;
function shooter(name: string, scores: number[], date = '2026-10-10'): RankableShooter {
  return {
    displayName: name,
    avatarUrl: null,
    isMe: false,
    series: scores.map((score) => ({
      score,
      date,
      createdAt: new Date(Date.UTC(2026, 9, 1, 0, 0, clock++)).toISOString(),
    })),
  };
}

const order = (shooters: RankableShooter[]) =>
  rankShooters(shooters).map((e) => [e.rank, e.displayName]);

describe('rankShooters', () => {
  it('ranks the best score first, however many lower series the others have', () => {
    expect(order([shooter('Many 24s', [24, 24, 24, 24]), shooter('One 25', [25, 10])])).toEqual([
      [1, 'One 25'],
      [2, 'Many 24s'],
    ]);
  });

  it('breaks a tie at the best score by how many series reached it', () => {
    expect(order([shooter('Two 25s', [25, 25]), shooter('Three 25s', [25, 25, 25])])).toEqual([
      [1, 'Three 25s'],
      [2, 'Two 25s'],
    ]);
  });

  it("follows the owner's example: five 25s each, A has two 24s and B one", () => {
    const a = shooter('A', [25, 25, 25, 25, 25, 24, 24]);
    const b = shooter('B', [25, 25, 25, 25, 25, 24, 23, 23, 23]);
    expect(order([b, a])).toEqual([
      [1, 'A'],
      [2, 'B'],
    ]);
  });

  it('goes down score by score until the counts differ', () => {
    const a = shooter('A', [25, 24, 20]);
    const b = shooter('B', [25, 24, 19, 19, 19]);
    expect(order([b, a])).toEqual([
      [1, 'A'],
      [2, 'B'],
    ]);
  });

  it('gives exact ties the same rank, listed by who reached their best score first', () => {
    const late = shooter('Late', [22, 18], '2026-10-20');
    const early = shooter('Early', [18, 22], '2026-10-05');
    const third = shooter('Third', [21]);
    expect(order([late, third, early])).toEqual([
      [1, 'Early'],
      [1, 'Late'],
      [3, 'Third'],
    ]);
  });

  it('orders an exact tie on the same day by creation time', () => {
    const first = shooter('First', [20], '2026-10-10');
    const second = shooter('Second', [20], '2026-10-10');
    expect(order([second, first])).toEqual([
      [1, 'First'],
      [1, 'Second'],
    ]);
  });

  it('reports best score, how many times it was reached and the number of series', () => {
    const [entry] = rankShooters([{ ...shooter('Me', [23, 25, 25, 0]), isMe: true }]);
    expect(entry).toEqual({
      rank: 1,
      displayName: 'Me',
      avatarUrl: null,
      bestScore: 25,
      bestScoreCount: 2,
      series: 4,
      isMe: true,
    });
  });

  it('leaves out shooters without series and handles all-zero scores', () => {
    expect(order([shooter('None', []), shooter('Zero', [0])])).toEqual([[1, 'Zero']]);
  });
});

describe('monthBounds', () => {
  it('runs from the 1st to the last day of the month', () => {
    expect(monthBounds('2026-10-24')).toEqual({ from: '2026-10-01', to: '2026-10-31' });
    expect(monthBounds('2028-02-10')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
    expect(monthBounds('2026-12-31')).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});

describe('shiftMonth', () => {
  it('steps to a day in the month before or after, across years', () => {
    expect(shiftMonth('2026-10-24', -1)).toBe('2026-09-30');
    expect(shiftMonth('2026-01-15', -1)).toBe('2025-12-31');
    expect(shiftMonth('2026-12-15', 1)).toBe('2027-01-01');
  });
});

describe('leaderboardQuerySchema', () => {
  const parse = (q: Record<string, string>) => leaderboardQuerySchema.safeParse(q);

  it('takes a club, one of its disciplines and, optionally, a field that has it', () => {
    expect(parse({ clubId: 'ccm', discipline: 'fosso' }).success).toBe(true);
    expect(parse({ clubId: 'ccm', discipline: 'fosso', fieldId: '2' }).success).toBe(true);
  });

  it('rejects an unknown club, a missing club or a field without the discipline', () => {
    expect(parse({ clubId: 'nope', discipline: 'fosso' }).error?.issues[0]?.path).toEqual([
      'clubId',
    ]);
    expect(parse({ discipline: 'fosso' }).success).toBe(false);
    expect(
      parse({ clubId: 'ccm', discipline: 'fosso', fieldId: '3' }).error?.issues[0]?.path,
    ).toEqual(['fieldId']);
  });
});

describe('leaderboardQuerySchema (month only)', () => {
  it('has no period any more (an old `period` is ignored) and rejects invalid dates', () => {
    expect(
      leaderboardQuerySchema.parse({ clubId: 'ccm', discipline: 'fosso', period: 'week' }),
    ).toEqual({ clubId: 'ccm', discipline: 'fosso' });
    expect(
      leaderboardQuerySchema.safeParse({ clubId: 'ccm', discipline: 'fosso', date: '2026-02-30' })
        .success,
    ).toBe(false);
  });
});

describe('profileUpdateSchema', () => {
  it('accepts the display name, the community switch, or both', () => {
    expect(profileUpdateSchema.parse({ displayName: ' Ana ' })).toEqual({ displayName: 'Ana' });
    expect(profileUpdateSchema.parse({ showInCommunity: false })).toEqual({
      showInCommunity: false,
    });
  });

  it('accepts a supported locale only', () => {
    expect(profileUpdateSchema.parse({ locale: 'pt-PT' })).toEqual({ locale: 'pt-PT' });
    expect(profileUpdateSchema.safeParse({ locale: 'pt-BR' }).success).toBe(false);
  });

  it('rejects an empty update', () => {
    expect(profileUpdateSchema.safeParse({}).success).toBe(false);
  });
});
