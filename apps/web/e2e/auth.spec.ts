import { accountItem, expect, expectCard, openAccountMenu, OTHER, OWNER, test } from './fixtures';

const CACHE_KEY = 'shooting-clays-cache';

/** Whether the persisted query cache exists in IndexedDB (idb-keyval's default store). */
const hasPersistedCache = (page: import('@playwright/test').Page) =>
  page.evaluate(
    (key) =>
      new Promise<boolean>((resolve) => {
        const open = indexedDB.open('keyval-store');
        open.onupgradeneeded = () => open.result.createObjectStore('keyval');
        open.onsuccess = () => {
          const get = open.result.transaction('keyval').objectStore('keyval').get(key);
          get.onsuccess = () => resolve(typeof get.result === 'string');
          get.onerror = () => resolve(false);
        };
        open.onerror = () => resolve(false);
      }),
    CACHE_KEY,
  );

test.describe('signed out', () => {
  test.use({ signedInAs: null });

  test('R13: signed-out users see the sign-in screen; Google sign-in opens their dashboard', async ({
    page,
  }) => {
    let apiCalls = 0;
    page.on('request', (r) => {
      if (new URL(r.url()).pathname.startsWith('/api/')) apiCalls++;
    });
    await page.goto('/app/history');
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    expect(apiCalls).toBe(0);

    await page.getByRole('button', { name: 'Sign in with Google' }).click();
    await expect(page.getByTestId('welcome')).toHaveText('Welcome, Test');
    await expectCard(page, 'Compak Sporting', '16 / 13 / 18');
  });
});

test('R15: the header greets the user by first name and signing out clears the cache', async ({
  page,
}) => {
  await page.goto('/app');
  await expect(page.getByTestId('welcome')).toHaveText('Welcome, Test');
  await expectCard(page, 'Compak Sporting', '16 / 13 / 18');
  await expect.poll(() => hasPersistedCache(page)).toBe(true);

  await openAccountMenu(page);
  await expect(page.getByText(OWNER.email)).toBeVisible();
  await accountItem(page, 'Sign out').click();

  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  await expect.poll(() => hasPersistedCache(page)).toBe(false);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('shooting-clays-user')))
    .toBeNull();
});

test("R16: switching account never shows the previous user's cached data", async ({
  page,
  auth,
}) => {
  await page.goto('/app');
  await expectCard(page, 'Compak Sporting', '16 / 13 / 18');
  await expect.poll(() => hasPersistedCache(page)).toBe(true);

  // Another (approved) user signs in on the same device, without the owner signing out first.
  auth.user = OTHER;
  await page.reload();
  await expect(page.getByTestId('welcome')).toHaveText('Welcome, Other');
  await expect(page.getByText('No sessions yet.', { exact: false })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Compak Sporting' })).toHaveCount(0);
});
