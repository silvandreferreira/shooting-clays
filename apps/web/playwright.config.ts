import { defineConfig, devices } from '@playwright/test';

export const E2E_API_URL = 'http://localhost:3100';
const WEB_URL = 'http://localhost:4173';

/**
 * E2E regression suite (docs/testing.md): production build of the web app + API in E2E mode
 * (in-memory PGlite seeded from data/clays-results.csv, fixed date 2026-10-23).
 * Tests share one database and reset it before each test, so they run serially.
 */
export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/smoke.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }], ['list']],
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // The service worker would serve stale builds between runs; the app cache is IndexedDB.
    serviceWorkers: 'block',
    timezoneId: 'Europe/Lisbon',
    locale: 'en-GB',
  },
  projects: [
    { name: 'pixel', use: { ...devices['Pixel 7'] } },
    { name: 'iphone', use: { ...devices['iPhone 15'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      command: 'pnpm --filter @shooting-clays/api start:e2e',
      url: `${E2E_API_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      cwd: '../..',
    },
    {
      command: 'pnpm build:vite && vite preview',
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      env: { API_URL: E2E_API_URL },
      timeout: 120_000,
    },
  ],
});
