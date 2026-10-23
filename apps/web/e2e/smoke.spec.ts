import { expect, test } from '@playwright/test';

// S1: read-only checks against production (playwright.smoke.config.ts). Never writes data.
test('S1 @smoke: production is up and the dashboard loads', async ({ page, request }) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);
  expect(await health.json()).toEqual({ ok: true });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await page.getByRole('link', { name: 'Add' }).click();
  await expect(page.getByRole('heading', { name: 'Add session' })).toBeVisible();
});
