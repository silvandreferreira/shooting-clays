import { describe, expect, it } from 'vitest';
import { formatList, formatMonth } from './format';

describe('formatList', () => {
  it.each([
    [['E'], 'E'],
    [['B', 'E'], 'B and E'],
    [['A', 'C', 'F'], 'A, C and F'],
  ])('formats %j as "%s"', (items, expected) => {
    expect(formatList(items)).toBe(expected);
  });
});

describe('formatMonth', () => {
  it('labels the leaderboard month', () => {
    expect(formatMonth('2026-10-01')).toBe('October 2026');
    expect(formatMonth('2027-01-01')).toBe('January 2027');
  });
});
