import { LOCALES, type Locale } from '@shooting-clays/shared/locales';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { en, type Strings } from './en';
import { ptPT } from './pt-PT';

export type { Strings };

const STRINGS: Record<Locale, Strings> = { en, 'pt-PT': ptPT };

export const LOCALE_STORAGE_KEY = 'shooting-clays:locale';

/** First visit: any Portuguese browser language → pt-PT, anything else → English. */
export function detectLocale(languages: readonly string[]): Locale {
  return languages.some((l) => l.toLowerCase().startsWith('pt')) ? 'pt-PT' : 'en';
}

function storedLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_STORAGE_KEY);
    return LOCALES.includes(value as Locale) ? (value as Locale) : null;
  } catch {
    return null;
  }
}

let current: Locale = 'en';

/** The active language, for code outside React components (date and list formatting). */
export const currentLocale = () => current;

/** Makes `locale` the active language for formatting and `<html lang>` (the provider calls it). */
export function activateLocale(locale: Locale) {
  current = locale;
  // Absent while the public pages are prerendered (src/site/entry-server.tsx).
  if (typeof document !== 'undefined') document.documentElement.lang = locale;
}

/** Saves the language choice on this device; the app opens in it next time. */
export function rememberLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private mode or storage blocked: the choice lasts until the page closes.
  }
}

export function initialLocale(): Locale {
  return storedLocale() ?? detectLocale(navigator.languages ?? [navigator.language]);
}

interface I18n {
  locale: Locale;
  t: Strings;
  /** Switches at once (no reload) and remembers the choice on this device. */
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18n>({ locale: 'en', t: en, setLocale: () => {} });

/** `locale` fixes the language (public pages: it comes from the URL); otherwise it is detected. */
export function I18nProvider({
  children,
  locale: fixed,
}: {
  children: ReactNode;
  locale?: Locale;
}) {
  const [locale, setState] = useState<Locale>(() => {
    const locale = fixed ?? initialLocale();
    activateLocale(locale);
    return locale;
  });
  const setLocale = useCallback((next: Locale) => {
    activateLocale(next);
    rememberLocale(next);
    setState(next);
  }, []);
  const value = useMemo(() => ({ locale, t: STRINGS[locale], setLocale }), [locale, setLocale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** UI strings in the active language. */
export const useT = () => useContext(I18nContext).t;

export function useLocale() {
  const { locale, setLocale } = useContext(I18nContext);
  return { locale, setLocale };
}

/** The user-facing message for an API error code; unknown codes are shown as they are. */
export function apiErrorMessage(t: Strings, code: string): string {
  return (t.apiErrors as Record<string, string>)[code] ?? code;
}

/** Strings for the active language outside components (e.g. error fallbacks). */
export const strings = () => STRINGS[current];
