import type { Locale } from '@shooting-clays/shared/locales';

/**
 * The public site (docs/architecture.md → Public site): prerendered pages, in European Portuguese
 * at the root and in English under /en. The app itself lives under /app.
 */
export const SITE_PAGES = ['home', 'disciplines', 'faq', 'contact'] as const;
export type SitePage = (typeof SITE_PAGES)[number];

export const SITE_PATHS: Record<Locale, Record<SitePage, string>> = {
  'pt-PT': { home: '/', disciplines: '/modalidades', faq: '/faq', contact: '/contactos' },
  en: { home: '/en', disciplines: '/en/disciplines', faq: '/en/faq', contact: '/en/contact' },
};

export interface SiteRoute {
  page: SitePage;
  locale: Locale;
  path: string;
}

export const SITE_ROUTES: SiteRoute[] = (Object.keys(SITE_PATHS) as Locale[]).flatMap((locale) =>
  SITE_PAGES.map((page) => ({ page, locale, path: SITE_PATHS[locale][page] })),
);

/** The route for a pathname (a trailing slash is ignored); `undefined` for any other path. */
export function findSiteRoute(pathname: string): SiteRoute | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return SITE_ROUTES.find((r) => r.path === path);
}

/** Where the app lives; its router uses this as the basename. */
export const APP_PATH = '/app';
