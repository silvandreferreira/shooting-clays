import { todayInLisbon, type CommunityPeriod } from '@shooting-clays/shared';
import { t } from '../i18n/en';

export const formatStat = (value: number | null) => (value === null ? t.noData : String(value));

const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const shortDateFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});

const listFormat = new Intl.ListFormat('en-GB', { style: 'long', type: 'conjunction' });

/** ["A", "C", "F"] → "A, C and F" */
export const formatList = (items: readonly string[]) => listFormat.format(items);

/** "2026-10-23" → "23 Oct 2026" (dates are calendar days, formatted without time zone shifts). */
export const formatDate = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00Z`));

export const formatShortDate = (iso: string) =>
  shortDateFormat.format(new Date(`${iso}T00:00:00Z`));

/** An instant ("2026-10-23T21:06:07Z") as its calendar day in Lisbon: "23 Oct 2026". */
export const formatDay = (timestamp: string) => formatDate(todayInLisbon(new Date(timestamp)));

const monthFormat = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** A leaderboard period: "24 Oct 2026", "19–25 Oct 2026" or "October 2026". */
export function formatPeriod(period: CommunityPeriod, from: string, to: string): string {
  const start = new Date(`${from}T00:00:00Z`);
  if (period === 'month') return monthFormat.format(start);
  if (period === 'day') return dateFormat.format(start);
  // Built by hand: Intl's formatRange spacing differs between browsers.
  if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8))}–${formatDate(to)}`;
  const first = from.slice(0, 4) === to.slice(0, 4) ? formatShortDate(from) : formatDate(from);
  return `${first} – ${formatDate(to)}`;
}
