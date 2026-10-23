import { describe, expect, it } from 'vitest';
import { formatList } from './format';

describe('formatList', () => {
  it.each([
    [['E'], 'E'],
    [['B', 'E'], 'B and E'],
    [['A', 'C', 'F'], 'A, C and F'],
  ])('formats %j as "%s"', (items, expected) => {
    expect(formatList(items)).toBe(expected);
  });
});
