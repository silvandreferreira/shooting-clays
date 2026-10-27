import type { Locale } from '@shooting-clays/shared/locales';
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { I18nProvider } from '../i18n';
import { en } from '../i18n/en';
import { ptPT } from '../i18n/pt-PT';
import { siteHead } from './head';
import { Site } from './Site';
import type { SiteRoute } from './routes';

export { SITE_ROUTES } from './routes';

const STRINGS = { en, 'pt-PT': ptPT };

/**
 * Renders a public page to HTML at build time (scripts/prerender.mjs); `null` renders the 404
 * page. The browser then hydrates it (./entry-client.tsx).
 */
export function render(route: SiteRoute | null, siteUrl: string) {
  const locale: Locale = route?.locale ?? 'pt-PT';
  const html = renderToString(
    <StrictMode>
      <I18nProvider locale={locale}>
        <Site route={route} />
      </I18nProvider>
    </StrictMode>,
  );
  return { html, head: siteHead(route, STRINGS[locale], siteUrl), lang: locale };
}
