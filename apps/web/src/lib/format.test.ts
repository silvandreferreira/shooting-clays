import { describe, expect, it } from 'vitest';
import { formatList, formatPeriod } from './format';

describe('formatList', () => {
  it.each([
    [['E'], 'E'],
    [['B', 'E'], 'B and E'],
    [['A', 'C', 'F'], 'A, C and F'],
  ])('formats %j as "%s"', (items, expected) => {
    expect(formatList(items)).toBe(expected);
  });
});

describe('formatPeriod', () => {
  it('labels a day, a month and weeks within or across months and years', () => {
    expect(formatPeriod('day', '2026-10-23', '2026-10-23')).toBe('23 Oct 2026');
    expect(formatPeriod('month', '2026-10-01', '2026-10-31')).toBe('October 2026');
    expect(formatPeriod('week', '2026-10-19', '2026-10-25')).toBe('19–25 Oct 2026');
    expect(formatPeriod('week', '2026-10-26', '2026-11-01')).toBe('26 Oct – 1 Nov 2026');
    expect(formatPeriod('week', '2026-12-28', '2027-01-03')).toBe('28 Dec 2026 – 3 Jan 2027');
  });
});
