import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The API runs on :3000 in development (pnpm dev) and :3100 in E2E mode (pnpm test:e2e).
const apiTarget = process.env.API_URL ?? 'http://localhost:3000';

export default defineConfig({
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
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': apiTarget },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: { '/api': apiTarget },
  },
});
