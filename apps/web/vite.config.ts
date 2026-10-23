import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The API runs on :3000 in development (pnpm dev) and :3100 in E2E mode (pnpm test:e2e).
const apiTarget = process.env.API_URL ?? 'http://localhost:3000';

/** `/auth/*` → Neon Auth, so its session cookie is first-party (same as the Vercel rewrite). */
function authProxy(neonAuthUrl: string | undefined): Record<string, ProxyOptions> {
  if (!neonAuthUrl) return {};
  const target = new URL(neonAuthUrl);
  return {
    // Regex key: only `/auth/...`, never app routes such as `/auth-check`.
    '^/auth/': {
      target: target.origin,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/auth/, target.pathname),
      cookieDomainRewrite: '',
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '');
  const proxy = { '/api': apiTarget, ...authProxy(process.env.NEON_AUTH_URL ?? env.NEON_AUTH_URL) };
  return {
    envDir: '../..',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Shooting Clays',
          short_name: 'Clays',
          description: 'Log clay shooting results and track progress per discipline.',
          theme_color: '#0f172a',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // API responses are cached by TanStack Query (IndexedDB), never by the service worker.
          navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
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
  };
});
