import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

const API_URL = 'http://localhost:3100';

export const REFERENCE_DATE = new Date('2026-10-23T12:00:00Z');

export interface E2EUser {
  id: string;
  email: string;
  name: string;
}

/** Owns the CSV history; the API in E2E mode uses the same id (apps/api/src/runtime.ts). */
export const OWNER: E2EUser = { id: 'e2e-owner', email: 'owner@example.test', name: 'Test Owner' };
/** Allowed (in ADMIN_EMAILS) but with no sessions. */
export const OTHER: E2EUser = {
  id: 'e2e-other',
  email: 'other@example.test',
  name: 'Other Shooter',
};
/** Signs in with Google but is not in ADMIN_EMAILS. */
export const STRANGER: E2EUser = { id: 'e2e-stranger', email: 'stranger@example.test', name: 'X' };

/** Who Neon Auth says is signed in; tests can change it (sign in, switch account). */
export interface FakeNeonAuth {
  user: E2EUser | null;
}

/**
 * Stands in for Neon Auth (`/auth/*`) so no test depends on Google. Session and sign-out follow
 * Better Auth's responses; `/auth/token` returns a JWT signed by the API's E2E key, so the real
 * API verifies it exactly like a Neon Auth token. "Sign in with Google" signs in `nextSignIn`.
 */
async function routeFakeNeonAuth(page: Page, auth: FakeNeonAuth, nextSignIn: () => E2EUser) {
  await page.route('**/auth/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const user = auth.user;
    if (pathname.endsWith('/get-session')) {
      const body = user && {
        session: { id: `session-${user.id}`, userId: user.id, expiresAt: '2099-01-01T00:00:00Z' },
        user: { ...user, emailVerified: true, image: null },
      };
      return route.fulfill({ json: body });
    }
    if (pathname.endsWith('/token')) {
      if (!user) return route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
      const res = await page.request.post(`${API_URL}/api/__test__/token`, { data: user });
      return route.fulfill({ json: await res.json() });
    }
    if (pathname.endsWith('/sign-out')) {
      auth.user = null;
      return route.fulfill({ json: { success: true } });
    }
    if (pathname.endsWith('/sign-in/social')) {
      auth.user = nextSignIn();
      return route.fulfill({
        json: { url: new URL('/', route.request().url()).href, redirect: true },
      });
    }
    return route.fulfill({ status: 404, json: { message: 'Not mocked' } });
  });
}

/**
 * Every test starts from the CSV history, a browser clock set to 2026-10-23 and, unless it
 * sets `signedInAs`, signed in as OWNER.
 */
export const test = base.extend<{
  signedInAs: E2EUser | null;
  signInAs: E2EUser;
  auth: FakeNeonAuth;
}>({
  signedInAs: [OWNER, { option: true }],
  signInAs: [OWNER, { option: true }],
  auth: [
    async ({ request, page, signedInAs, signInAs }, use) => {
      const res = await request.post(`${API_URL}/api/__test__/reset`);
      expect(res.ok()).toBe(true);
      // Starts at the reference date and keeps flowing: a frozen Date.now() would stall the cache
      // persister's throttle (it waits for time to pass between writes).
      await page.clock.install({ time: REFERENCE_DATE });
      const auth: FakeNeonAuth = { user: signedInAs };
      await routeFakeNeonAuth(page, auth, () => signInAs);
      await use(auth);
    },
    { auto: true },
  ],
});

export { expect };

export const card = (page: Page, name: string) => page.getByRole('article', { name, exact: true });

export async function expectCard(page: Page, name: string, values: string) {
  const [avg, min, max] = values === '—' ? ['—', '—', '—'] : values.split(' / ');
  const c = card(page, name);
  await expect(c.getByTestId('avg')).toHaveText(avg!);
  await expect(c.getByTestId('min')).toHaveText(min!);
  await expect(c.getByTestId('max')).toHaveText(max!);
}

export async function selectPeriod(page: Page, period: 'All time' | 'Last month' | 'This month') {
  await page.getByRole('button', { name: period }).click();
  await expect(page.getByRole('button', { name: period })).toHaveAttribute('aria-pressed', 'true');
}

export async function seriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}
