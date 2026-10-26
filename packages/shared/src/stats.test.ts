import { describe, expect, it } from 'vitest';
import {
  chartRangeStart,
  computeDashboard,
  computeStats,
  periodsForDate,
  previousMonth,
  todayInLisbon,
} from './stats';

describe('computeStats', () => {
  it('returns nulls and a zero count when there are no scores', () => {
    expect(computeStats([])).toEqual({ avg: null, min: null, max: null, count: 0 });
  });

  it('rounds the average to the nearest integer', () => {
    expect(computeStats([10, 11])).toEqual({ avg: 11, min: 10, max: 11, count: 2 });
    expect(computeStats([10, 10, 11])).toEqual({ avg: 10, min: 10, max: 11, count: 3 });
  });
});

describe('periods', () => {
  it('computes the previous month across a year boundary', () => {
    expect(previousMonth('2026-01')).toBe('2025-12');
    expect(previousMonth('2026-10')).toBe('2026-09');
  });

  it('assigns dates to calendar months of the reference date', () => {
    expect(periodsForDate('2026-10-01', '2026-10-23')).toEqual(['allTime', 'thisMonth']);
    expect(periodsForDate('2026-09-30', '2026-10-23')).toEqual(['allTime', 'lastMonth']);
    expect(periodsForDate('2026-08-31', '2026-10-23')).toEqual(['allTime']);
    expect(periodsForDate('2025-12-31', '2026-01-05')).toEqual(['allTime', 'lastMonth']);
  });

  it('uses the Europe/Lisbon calendar day', () => {
    // Lisbon is UTC+1 in summer and UTC+0 in winter.
    expect(todayInLisbon(new Date('2026-07-31T23:30:00Z'))).toBe('2026-08-01');
    expect(todayInLisbon(new Date('2026-12-31T23:30:00Z'))).toBe('2026-12-31');
  });
});

describe('computeDashboard', () => {
  const dashboard = computeDashboard(
    [
      { date: '2026-10-02', discipline: 'compak', score: 18 },
      { date: '2026-09-15', discipline: 'compak', score: 14 },
      { date: '2026-10-20', discipline: 'compak', score: 13 },
      { date: '2026-08-01', discipline: 'trap', score: 19 },
    ],
    '2026-10-23',
  );

  it('computes every period per discipline', () => {
    expect(dashboard.periods.allTime.compak).toEqual({ avg: 15, min: 13, max: 18, count: 3 });
    expect(dashboard.periods.thisMonth.compak).toEqual({ avg: 16, min: 13, max: 18, count: 2 });
    expect(dashboard.periods.lastMonth.compak).toEqual({ avg: 14, min: 14, max: 14, count: 1 });
    expect(dashboard.periods.thisMonth.trap.count).toBe(0);
  });

  it('includes every discipline, even without sessions', () => {
    expect(dashboard.periods.allTime.sporting).toEqual({
      avg: null,
      min: null,
      max: null,
      count: 0,
    });
    expect(dashboard.series.sporting).toEqual([]);
  });

  it('sorts series by date', () => {
    expect(dashboard.series.compak.map((p) => p.date)).toEqual([
      '2026-09-15',
      '2026-10-02',
      '2026-10-20',
    ]);
  });
});

describe('chartRangeStart', () => {
  it('counts whole months back from the reference date, inclusive', () => {
    expect(chartRangeStart('3m', '2026-10-23')).toBe('2026-07-23');
    expect(chartRangeStart('6m', '2026-10-23')).toBe('2026-04-23');
    expect(chartRangeStart('1y', '2026-10-23')).toBe('2025-10-23');
  });

  it('uses the last day of a shorter month', () => {
    expect(chartRangeStart('3m', '2026-05-31')).toBe('2026-02-28');
    expect(chartRangeStart('3m', '2028-05-31')).toBe('2028-02-29');
    expect(chartRangeStart('6m', '2026-12-31')).toBe('2026-06-30');
  });

  it('crosses the year boundary', () => {
    expect(chartRangeStart('3m', '2027-01-15')).toBe('2026-10-15');
    expect(chartRangeStart('1y', '2027-02-28')).toBe('2026-02-28');
  });

  it('all time has no start', () => {
    expect(chartRangeStart('all', '2026-10-23')).toBeNull();
  });
});
