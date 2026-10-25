import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';

const API_URL = 'http://localhost:3100';

export const REFERENCE_DATE = new Date('2026-10-23T12:00:00Z');

export interface E2EUser {
  id: string;
  email: string;
  name: string;
  /** Account state the API gives this user on first sign-in (default: pending). */
  status?: 'pending' | 'active' | 'disabled';
}

/**
 * Owns the CSV history and is the admin (the only ADMIN_EMAILS address in E2E mode); the API uses
 * the same id (apps/api/src/e2e-runtime.ts).
 */
export const OWNER: E2EUser = { id: 'e2e-owner', email: 'owner@example.test', name: 'Test Owner' };
/** An approved user with no sessions. */
export const OTHER: E2EUser = {
  id: 'e2e-other',
  email: 'other@example.test',
  name: 'Other Shooter',
  status: 'active',
};
/** Signs in with Google for the first time: waiting for approval. */
export const PENDING: E2EUser = {
  id: 'e2e-pending',
  email: 'pending@example.test',
  name: 'Pat New',
};
/** Disabled by the admin. */
export const DISABLED: E2EUser = {
  id: 'e2e-disabled',
  email: 'disabled@example.test',
  name: 'Dee Blocked',
  status: 'disabled',
};

/** Signs the user in once on the API side, as Neon Auth would, so the admin can see them. */
export async function registerUser(request: APIRequestContext, user: E2EUser) {
  const data = { ...user, status: user.status ?? 'pending' };
  const res = await request.post(`${API_URL}/api/__test__/token`, { data });
  expect(res.ok()).toBe(true);
}

export interface E2ESession {
  date: string;
  discipline: string;
  score: number;
}

/** Registers the user (active unless they say otherwise) and logs sessions through the API. */
export async function seedSessions(
  request: APIRequestContext,
  user: E2EUser,
  sessions: E2ESession[],
) {
  const res = await request.post(`${API_URL}/api/__test__/token`, {
    data: { ...user, status: user.status ?? 'active' },
  });
  expect(res.ok()).toBe(true);
  const { token } = (await res.json()) as { token: string };
  for (const data of sessions) {
    const created = await request.post(`${API_URL}/api/sessions`, {
      data,
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(created.ok()).toBe(true);
  }
}

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
        user: { id: user.id, email: user.email, name: user.name, emailVerified: true, image: null },
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
