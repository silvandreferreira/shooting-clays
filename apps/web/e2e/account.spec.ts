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
      if (pathname.startsWith('/api/') && pathname !== '/api/me') dataRequests.push(pathname);
    });
    await page.goto('/');
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

    // Data routes are not reachable.
    await page.goto('/history');
    await expect(page).toHaveURL(/\/$/);
    expect(await seriousA11yViolations(page)).toEqual([]);
  });
});

test.describe('disabled account', () => {
  test.use({ signedInAs: DISABLED });

  test('R21: a disabled user sees only the inactive notice and can sign out', async ({ page }) => {
    await page.goto('/');
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
  await page.goto('/');
  const adminTab = (await mainNav(page)).getByRole('link', { name: /Admin/ });
  await expect(adminTab).toContainText('1 waiting for approval');
  await adminTab.click();

  await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
  const row = page.getByRole('listitem', { name: PENDING.name });
  await expect(row).toContainText(PENDING.email);
  await expect(row.getByTestId('status')).toHaveText('Pending');
  // The admin's own row has no controls.
  await expect(page.getByRole('listitem', { name: 'Test Owner' }).getByRole('switch')).toHaveCount(
    0,
  );
  expect(await seriousA11yViolations(page)).toEqual([]);

  // Approve, undo, approve again.
  await row.getByRole('switch', { name: `Allow ${PENDING.name} to use the app` }).click();
  await expect(row.getByTestId('status')).toHaveText('Active');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(row.getByTestId('status')).toHaveText('Pending');
  await row.getByRole('switch').click();
  await expect(row.getByTestId('status')).toHaveText('Active');
  await expect((await mainNav(page)).getByRole('link', { name: /Admin/ })).not.toContainText(
    'waiting for approval',
  );

  auth.user = PENDING;
  await page.goto('/');
  await expect(page.getByTestId('welcome')).toHaveText('Welcome, Pat');
  await expect(page.getByTestId('pending-banner')).toHaveCount(0);
  await expect(page.getByText('No sessions yet.', { exact: false })).toBeVisible();
  await expect((await mainNav(page)).getByRole('link', { name: 'History' })).toBeVisible();
});

test('R23: the admin removes a user after typing their name; signing in again starts over', async ({
  page,
  request,
  auth,
}) => {
  await registerUser(request, OTHER);
  await page.goto('/admin');
  const row = page.getByRole('listitem', { name: OTHER.name });
  await row.getByRole('button', { name: 'Remove' }).click();

  const dialog = page.getByRole('dialog', { name: `Remove ${OTHER.name}?` });
  await expect(dialog).toContainText('cannot be undone');
  const confirm = dialog.getByRole('button', { name: 'Remove permanently' });
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(`Type "${OTHER.name}" to confirm`).fill('Other');
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel(`Type "${OTHER.name}" to confirm`).fill(OTHER.name);
  await confirm.click();

  await expect(dialog).toHaveCount(0);
  await expect(row).toHaveCount(0);
  await expect(page.getByText(`${OTHER.name} has been removed.`)).toBeVisible();

  // Google signs them in again: a new account, waiting for approval.
  auth.user = { ...OTHER, status: undefined };
  await page.goto('/');
  await expect(page.getByTestId('pending-banner')).toBeVisible();
});
