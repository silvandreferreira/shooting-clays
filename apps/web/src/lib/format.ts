import { todayInLisbon, type CommunityPeriod, type Locale } from '@shooting-clays/shared';
import { currentLocale, strings } from '../i18n';

export const formatStat = (value: number | null) =>
  value === null ? strings().noData : String(value);

/** Intl locale per UI language: British English dates ("23 Oct 2026") or Portuguese ones. */
const INTL_LOCALE: Record<Locale, string> = { en: 'en-GB', 'pt-PT': 'pt-PT' };

interface Formatters {
  day: Intl.DateTimeFormat;
  month: Intl.DateTimeFormat;
  monthYear: Intl.DateTimeFormat;
  list: Intl.ListFormat;
}

const cache = new Map<Locale, Formatters>();

function formatters(): Formatters {
  const locale = currentLocale();
  let f = cache.get(locale);
  if (!f) {
    const intl = INTL_LOCALE[locale];
    f = {
      day: new Intl.DateTimeFormat(intl, { day: 'numeric', timeZone: 'UTC' }),
      month: new Intl.DateTimeFormat(intl, { month: 'short', timeZone: 'UTC' }),
      monthYear: new Intl.DateTimeFormat(intl, { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      list: new Intl.ListFormat(intl, { style: 'long', type: 'conjunction' }),
    };
    cache.set(locale, f);
  }
  return f;
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** ["A", "C", "F"] → "A, C and F" / "A, C e F" */
export const formatList = (items: readonly string[]) => formatters().list.format(items);

/**
 * "2026-10-23" → "23 Oct" / "23 out." (dates are calendar days, formatted without time zone
 * shifts). Built from parts: Portuguese full dates would otherwise come out as "23/10/2026".
 */
export const formatShortDate = (iso: string) => {
  const { day, month } = formatters();
  return `${day.format(toDate(iso))} ${month.format(toDate(iso))}`;
};

/** "2026-10-23" → "23 Oct 2026" / "23 out. 2026". */
export const formatDate = (iso: string) => `${formatShortDate(iso)} ${iso.slice(0, 4)}`;

/** An instant ("2026-10-23T21:06:07Z") as its calendar day in Lisbon: "23 Oct 2026". */
export const formatDay = (timestamp: string) => formatDate(todayInLisbon(new Date(timestamp)));

/** A leaderboard period: "24 Oct 2026", "19–25 Oct 2026" or "October 2026" / "outubro de 2026". */
export function formatPeriod(period: CommunityPeriod, from: string, to: string): string {
  if (period === 'month') return formatters().monthYear.format(toDate(from));
  if (period === 'day') return formatDate(from);
  // Built by hand: Intl's formatRange spacing differs between browsers.
  if (from.slice(0, 7) === to.slice(0, 7)) return `${Number(from.slice(8))}–${formatDate(to)}`;
  const first = from.slice(0, 4) === to.slice(0, 4) ? formatShortDate(from) : formatDate(from);
  return `${first} – ${formatDate(to)}`;
}
