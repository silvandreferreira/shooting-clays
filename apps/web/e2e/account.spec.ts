import {
  DISABLED,
  expect,
  mainNav,
  OTHER,
  PENDING,
  registerUser,
  seriousA11yViolations,
  test,
} from './fixtures';

test.describe('pending account', () => {
  test.use({ signedInAs: PENDING });

  test('R20: a new user waits for approval: banner, sample data, Add disabled, no History', async ({
    page,
  }) => {
    const dataRequests: string[] = [];
    page.on('request', (r) => {
      const { pathname } = new URL(r.url());
      // Their account and notifications only: no data endpoint is called.
      const allowed = ['/api/me', '/api/notifications'];
      if (pathname.startsWith('/api/') && !allowed.includes(pathname)) dataRequests.push(pathname);
    });
    await page.goto('/app');
    await expect(page.getByTestId('pending-banner')).toContainText('waiting for approval');
    await expect(page.getByTestId('welcome')).toHaveText('Welcome, Pat');

    // Sample data from the front end, labelled on every card and chart.
    const cards = page.getByRole('article');
    await expect(cards.first()).toBeVisible();
    for (const card of await cards.all()) await expect(card).toContainText('Sample data');
    await expect(page.getByRole('heading', { name: /Scores over time/ })).toContainText(
      'Sample data',
    );
    expect(dataRequests).toEqual([]);

    const nav = await mainNav(page);
    await expect(nav.getByRole('link', { name: 'History' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Community' })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Admin' })).toHaveCount(0);
    const add = nav.getByRole('button', { name: 'Add' });
    await expect(add).toHaveAttribute('aria-disabled', 'true');
    // aria-disabled: Playwright treats it as disabled, but a tap still explains why.
    await add.click({ force: true });
    await expect(page.getByText('once the administrator approves your account')).toBeVisible();
    // The round "+" too (R51).
    await page.reload();
    const addButton = page.getByRole('button', { name: 'Add session' });
    await expect(addButton).toHaveAttribute('aria-disabled', 'true');
    await addButton.click({ force: true });
    await expect(page.getByText('once the administrator approves your account')).toBeVisible();

    // Data routes are not reachable.
    await page.goto('/app/history');
    await expect(page).toHaveURL(/\/app$/);
    expect(await seriousA11yViolations(page)).toEqual([]);
  });
});

test.describe('disabled account', () => {
  test.use({ signedInAs: DISABLED });

  test('R21: a disabled user sees only the inactive notice and can sign out', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByRole('heading', { name: 'Your account is inactive' })).toBeVisible();
    await expect(page.getByText(DISABLED.email)).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0);
    await expect(page.getByRole('article')).toHaveCount(0);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  });
});

test('R22: the admin approves a pending user, who then sees their real (empty) dashboard', async ({
  page,
  request,
  auth,
}) => {
  await registerUser(request, PENDING);
  await page.goto('/app');
  const adminTab = (await mainNav(page)).getByRole('link', { name: /Admin/ });
  await expect(adminTab).toContainText('1 waiting for approval');
  await adminTab.click();

  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  const row = page.getByRole('listitem', { name: PENDING.name });
  await expect(row).toContainText(PENDING.email);
  await expect(row.getByRole('switch')).not.toBeChecked();
  // The admin's own row has no controls.
  await expect(page.getByRole('listitem', { name: 'Test Owner' }).getByRole('switch')).toHaveCount(
    0,
  );
  expect(await seriousA11yViolations(page)).toEqual([]);

  // Approve, undo, approve again.
  await row.getByRole('switch', { name: `Allow ${PENDING.name} to use the app` }).click();
  await expect(row.getByRole('switch')).toBeChecked();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(row.getByRole('switch')).not.toBeChecked();
  await row.getByRole('switch').click();
  await expect(row.getByRole('switch')).toBeChecked();
  await expect((await mainNav(page)).getByRole('link', { name: /Admin/ })).not.toContainText(
    'waiting for approval',
  );

  auth.user = PENDING;
  await page.goto('/app');
  await expect(page.getByTestId('welcome')).toHaveText('Welcome, Pat');
  await expect(page.getByTestId('pending-banner')).toHaveCount(0);
  await expect(page.getByText('No sessions yet.', { exact: false })).toBeVisible();
  await expect((await mainNav(page)).getByRole('link', { name: 'History' })).toBeVisible();
});

test('R23: the admin revokes a user with a message; they read it, the account is deleted, and signing in again starts over', async ({
  page,
  request,
  auth,
}) => {
  await registerUser(request, OTHER);
  await page.goto('/app/admin');
  const row = page.getByRole('listitem', { name: OTHER.name });
  await row.getByRole('button', { name: 'Remove' }).click();

  const dialog = page.getByRole('dialog', { name: `Revoke access for ${OTHER.name}?` });
  await expect(dialog).toContainText('Their sessions are deleted at once');
  const message = dialog.getByLabel('Message to the user');
  await expect(message).toHaveValue(/^Thank you for your interest in Shooting Clays\./);
  await message.fill('We are closing the beta. Thank you!');
  const confirm = dialog.getByRole('button', { name: 'Revoke access' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(`Type "${OTHER.name}" to confirm`).fill('Other');
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(`Type "${OTHER.name}" to confirm`).fill(OTHER.name);
  await confirm.click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(`${OTHER.name}'s access has been revoked.`)).toBeVisible();
  await expect(row).toContainText('Revoked: waiting to be read');
  await expect(row).toContainText('0 sessions');
  await expect(row.getByRole('switch')).toHaveCount(0);
  await expect(row.getByRole('button', { name: 'Delete now' })).toBeVisible();

  // They open the app: only the message is left. Reading it deletes the account.
  auth.user = { ...OTHER, status: undefined };
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Your access has been revoked' })).toBeVisible();
  await expect(page.getByTestId('revoked-message')).toHaveText(
    'We are closing the beta. Thank you!',
  );
  await page.getByRole('button', { name: 'Mark as read' }).click();
  await expect(page).toHaveURL('/en');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Log your clay shooting series and beat your own best',
  );

  // Google signs them in again: a new account, waiting for approval.
  auth.user = { ...OTHER, status: undefined };
  await page.goto('/app');
  await expect(page.getByTestId('pending-banner')).toBeVisible();
});

test('R23: "Delete now" removes a revoked account at once', async ({ page, request }) => {
  await registerUser(request, OTHER);
  await page.goto('/app/admin');
  const row = page.getByRole('listitem', { name: OTHER.name });
  await row.getByRole('button', { name: 'Remove' }).click();
  const revoke = page.getByRole('dialog', { name: `Revoke access for ${OTHER.name}?` });
  await revoke.getByLabel(`Type "${OTHER.name}" to confirm`).fill(OTHER.name);
  await revoke.getByRole('button', { name: 'Revoke access' }).click();

  await row.getByRole('button', { name: 'Delete now' }).click();
  const dialog = page.getByRole('dialog', { name: `Remove ${OTHER.name}?` });
  await expect(dialog).toContainText('cannot be undone');
  await dialog.getByLabel(`Type "${OTHER.name}" to confirm`).fill(OTHER.name);
  await dialog.getByRole('button', { name: 'Remove permanently' }).click();
  await expect(row).toHaveCount(0);
  await expect(page.getByText(`${OTHER.name} has been removed.`)).toBeVisible();
});

test('R37: the admin searches users by name or email and filters All · Active · Pending', async ({
  page,
  request,
}) => {
  for (const user of [PENDING, OTHER, DISABLED]) await registerUser(request, user);
  await page.goto('/app/admin');
  const rows = page.getByRole('listitem');
  const filters = page.getByRole('group', { name: 'Show' });
  // Owner, other, pending and disabled.
  await expect(filters.getByRole('button', { name: 'All (4)' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(rows).toHaveCount(4);
  // The switch says it all: no status text under the last activity.
  await expect(page.getByRole('listitem', { name: PENDING.name })).not.toContainText('Pending');

  await filters.getByRole('button', { name: 'Pending (1)' }).click();
  await expect(page).toHaveURL(/status=pending/);
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAccessibleName(PENDING.name);

  // Disabled accounts only show under All.
  await filters.getByRole('button', { name: 'Active (2)' }).click();
  await expect(rows).toHaveCount(2);
  await expect(page.getByRole('listitem', { name: DISABLED.name })).toHaveCount(0);

  await filters.getByRole('button', { name: /^All/ }).click();
  const search = page.getByRole('searchbox', { name: 'Search by name or email' });
  await search.fill('OTHER@EXAMPLE');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toHaveAccessibleName(OTHER.name);
  await search.fill('nobody');
  await expect(page.getByText('No users match.')).toBeVisible();
});

test('R38: the admin clears this device cache in Settings and the app reloads', async ({
  page,
}) => {
  await page.goto('/app/admin');
  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear cache and reload' })).toHaveCount(0);
  await page.goto('/app/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.evaluate(async () => {
    await (await caches.open('e2e-marker')).put('/marker', new Response('x'));
  });
  let reloaded = false;
  page.on('load', () => (reloaded = true));

  await page.getByRole('button', { name: 'Clear cache and reload' }).click();
  await expect.poll(() => reloaded).toBe(true);
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  expect(await page.evaluate(() => caches.has('e2e-marker'))).toBe(false);
});
