import { expect, OWNER, seriousA11yViolations, test, usesMenu } from './fixtures';

const menuButton = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: /^Menu/ });

async function expectMenuFlow(page: import('@playwright/test').Page) {
  await page.goto('/app');
  // No bottom bar and no account menu: one menu button in the header.
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Account' })).toHaveCount(0);

  await menuButton(page).click();
  await expect(menuButton(page)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText(OWNER.email)).toBeVisible();
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const name of ['Dashboard', 'Add', 'History', 'Community', 'Admin']) {
    await expect(nav.getByRole('link', { name })).toBeVisible();
  }
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  expect(await seriousA11yViolations(page)).toEqual([]);

  // Escape closes it; choosing a page closes it too.
  await page.keyboard.press('Escape');
  await expect(nav).toHaveCount(0);
  await menuButton(page).click();
  await nav.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(nav).toHaveCount(0);

  await menuButton(page).click();
  await page.getByRole('link', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await menuButton(page).click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
}

test('R34: on phones the bottom bar becomes a menu with every page, Settings and Sign out', async ({
  page,
}) => {
  test.skip(!usesMenu(page), 'Phones only (the desktop project has R35)');
  await expectMenuFlow(page);
});

test.describe('on a tablet', () => {
  test.use({ viewport: { width: 820, height: 1180 } });

  test('R34: on tablets the bottom bar becomes the same menu', async ({ page }) => {
    await expectMenuFlow(page);
  });
});

test('R35: on desktop the bottom bar and the account menu stay as they are', async ({ page }) => {
  test.skip(usesMenu(page), 'Desktop only (phones and tablets have R34)');
  await page.goto('/app');
  await expect(menuButton(page)).toHaveCount(0);
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const name of ['Dashboard', 'Add', 'History', 'Community', 'Admin']) {
    await expect(nav.getByRole('link', { name })).toBeVisible();
  }
  await page.getByRole('button', { name: 'Account' }).click();
  await expect(page.getByRole('menuitem', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: 'Sign out' })).toBeVisible();
});
