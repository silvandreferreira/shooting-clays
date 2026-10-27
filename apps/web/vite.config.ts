import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Connect, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { findSiteRoute } from './src/site/routes';

// The API runs on :3000 in development (pnpm dev) and :3100 in E2E mode (pnpm test:e2e).
const apiTarget = process.env.API_URL ?? 'http://localhost:3000';

// The API also proxies Neon Auth (`/auth/*`), exactly as on Vercel. Regex key: only `/auth/...`,
// never app routes such as `/auth-check`.
const proxy = { '/api': apiTarget, '^/auth/': apiTarget };

/**
 * Two pages: the public site (index.html, prerendered by scripts/prerender.mjs) and the app
 * (app/index.html), a single-page app under /app. Vercel routes them the same way
 * (scripts/build-vercel.mjs); this does it for `vite` and `vite preview`.
 */
const appFallback: Connect.NextHandleFunction = (req, _res, next) => {
  if (req.url && /^\/app(\/[^.]*)?(\?.*)?$/.test(req.url)) req.url = '/app/index.html';
  next();
};

/** `vite preview` only: each public page from its prerendered file, with or without a slash. */
const sitePages: Connect.NextHandleFunction = (req, _res, next) => {
  const route = req.url && findSiteRoute(req.url.split('?')[0]!);
  if (route && route.path !== '/') req.url = `${route.path}/index.html`;
  next();
};

const routePages: Plugin = {
  name: 'route-pages',
  configureServer: (server) => void server.middlewares.use(appFallback),
  configurePreviewServer: (server) => {
    server.middlewares.use(appFallback);
    server.middlewares.use(sitePages);
  },
};

export default defineConfig({
  envDir: '../..',
  // Vercel sets VERCEL=1 in its builds; only those load Web Analytics and Speed Insights
  // (src/components/VercelMetrics.tsx).
  define: {
    'import.meta.env.VITE_VERCEL_METRICS': JSON.stringify(process.env.VERCEL === '1'),
  },
  build: {
    rollupOptions: {
      input: {
        site: fileURLToPath(new URL('index.html', import.meta.url)),
        app: fileURLToPath(new URL('app/index.html', import.meta.url)),
      },
    },
  },
  plugins: [
    routePages,
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // The app registers it (src/main.tsx); the public pages do not.
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Shooting Clays',
        short_name: 'Clays',
        description: 'Log clay shooting results and track progress per discipline.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/app',
        scope: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Offline, any /app page opens the app. API responses are cached by TanStack Query
        // (IndexedDB), never by the service worker. The public pages are prerendered after this
        // build and always come from the network; the site template (index.html) is never served.
        navigateFallback: '/app/index.html',
        navigateFallbackAllowlist: [/^\/app(\/|$)/],
        globIgnores: ['index.html'],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy,
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy,
  },
});
