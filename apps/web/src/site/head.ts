import { LOCALES, type Locale } from '@shooting-clays/shared/locales';
import type { Strings } from '../i18n';
import { SITE_PATHS, type SiteRoute } from './routes';

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Open Graph wants language_TERRITORY. */
const OG_LOCALE: Record<Locale, string> = { 'pt-PT': 'pt_PT', en: 'en_GB' };

/**
 * The `<head>` tags of a prerendered public page: title, description, canonical URL, the other
 * language (hreflang), social cards and structured data. `siteUrl` has no trailing slash.
 */
export function siteHead(route: SiteRoute | null, t: Strings, siteUrl: string): string {
  const meta = t.site.meta[route?.page ?? 'notFound'];
  const tags = [
    `<title>${escape(meta.title)}</title>`,
    `<meta name="description" content="${escape(meta.description)}" />`,
  ];
  if (!route) return [...tags, '<meta name="robots" content="noindex" />'].join('\n    ');

  const url = (path: string) => `${siteUrl}${path === '/' ? '/' : path}`;
  const image = `${siteUrl}/images/og.png`;
  tags.push(
    `<link rel="canonical" href="${url(route.path)}" />`,
    ...LOCALES.map(
      (l) => `<link rel="alternate" hreflang="${l}" href="${url(SITE_PATHS[l][route.page])}" />`,
    ),
    `<link rel="alternate" hreflang="x-default" href="${url(SITE_PATHS['pt-PT'][route.page])}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escape(t.appName)}" />`,
    `<meta property="og:title" content="${escape(meta.title)}" />`,
    `<meta property="og:description" content="${escape(meta.description)}" />`,
    `<meta property="og:url" content="${url(route.path)}" />`,
    `<meta property="og:image" content="${image}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[route.locale]}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  );

  const data =
    route.page === 'home'
      ? {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: t.appName,
          url: url(route.path),
          description: meta.description,
          applicationCategory: 'SportsApplication',
          operatingSystem: 'Web',
          inLanguage: route.locale,
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        }
      : route.page === 'faq'
        ? {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            inLanguage: route.locale,
            mainEntity: Object.values(t.faq.items).map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          }
        : null;
  if (data) {
    // `<` escaped so that no text can close the script element.
    const json = JSON.stringify(data).replace(/</g, '\\u003c');
    tags.push(`<script type="application/ld+json">${json}</script>`);
  }
  return tags.join('\n    ');
}
