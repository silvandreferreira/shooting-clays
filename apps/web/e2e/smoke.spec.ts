import { expect, test } from '@playwright/test';

// S1: read-only checks against production (playwright.smoke.config.ts), signed out. Never writes
// data and never signs in.
test('S1 @smoke: production is up, the public site and sign-in are reachable and the API requires it', async ({
  page,
  request,
}) => {
  const health = await request.get('/api/health');
  expect(health.ok()).toBe(true);
  expect(await health.json()).toEqual({ ok: true });

  // Authorization is enforced by the API.
  const dashboard = await request.get('/api/dashboard');
  expect(dashboard.status()).toBe(401);

  // The /auth proxy reaches this environment's Neon Auth (no session: null).
  const session = await request.get('/auth/get-session');
  expect(session.ok()).toBe(true);

  // A deep link is served by the app (client route) and shows the sign-in screen.
  await page.goto('/app/history');
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
