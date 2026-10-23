import { defineConfig, devices } from '@playwright/test';

/** Read-only smoke tests against a deployed environment: PROD_URL=https://… */
const baseURL = process.env.PROD_URL;
if (!baseURL) throw new Error('PROD_URL is not defined');

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/smoke.spec.ts',
  retries: 2,
  reporter: [['html', { open: 'never', outputFolder: 'playwright-report-smoke' }], ['list']],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [{ name: 'pixel', use: { ...devices['Pixel 7'] } }],
});
