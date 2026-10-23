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

/** "2026-10-23" → "23 Oct 2026" (dates are calendar days, formatted without time zone shifts). */
export const formatDate = (iso: string) => dateFormat.format(new Date(`${iso}T00:00:00Z`));

export const formatShortDate = (iso: string) =>
  shortDateFormat.format(new Date(`${iso}T00:00:00Z`));
