// Prerenders the public site after `vite build` and the SSR build of src/site/entry-server.tsx:
// one HTML file per page (dist/<path>/index.html), the 404 page, sitemap.xml and robots.txt.
// Search engines then read real content without running JavaScript; the browser hydrates it.
// See docs/architecture.md → Public site.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const ssr = new URL('../dist-ssr/', import.meta.url);
// The canonical address of the public pages (no trailing slash).
const siteUrl = (process.env.SITE_URL ?? 'https://shooting-clays.vercel.app').replace(/\/+$/, '');

const { render, SITE_ROUTES } = await import(new URL('entry-server.js', ssr).href);
const template = await readFile(new URL('index.html', dist), 'utf8');

const page = (route) => {
  const { html, head, lang } = render(route, siteUrl);
  return template
    .replace('<!--site-lang-->', lang)
    .replace('<!--site-head-->', head)
    .replace('<!--site-html-->', html);
};

for (const route of SITE_ROUTES) {
  const dir = new URL(`.${route.path === '/' ? '' : route.path}/`, dist);
  await mkdir(dir, { recursive: true });
  await writeFile(new URL('index.html', dir), page(route));
}
await writeFile(new URL('404.html', dist), page(null));

const urls = SITE_ROUTES.map((r) => `  <url><loc>${siteUrl}${r.path}</loc></url>`).join('\n');
await writeFile(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
);
await writeFile(
  new URL('robots.txt', dist),
  `User-agent: *\nDisallow: /app\nDisallow: /api\nDisallow: /auth\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
);
// Vercel routes every public page to its file (scripts/build-vercel.mjs).
await writeFile(new URL('routes.json', ssr), JSON.stringify(SITE_ROUTES.map((r) => r.path)));
await rm(new URL('entry-server.js', ssr));

console.log(`Prerendered ${SITE_ROUTES.length} public pages and the 404 page`);
