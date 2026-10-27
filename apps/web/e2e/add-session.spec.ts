import { card, expect, expectCard, goTo, selectPeriod, test } from './fixtures';

test('R4: adding a session updates the dashboard without a reload', async ({ page }) => {
  await page.goto('/app');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  await goTo(page, 'Add');

  await expect(page.getByLabel('Date')).toHaveValue('2026-10-23');
  await page.getByText('Compak Sporting', { exact: true }).click();
  await page.getByLabel('Score (out of 25)').fill('25');
  await page.getByText('B', { exact: true }).click();
  await page.getByLabel('Notes').fill('Best series ever');

  // Marker that a full page load would wipe out.
  await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
  const post = page.waitForResponse(
    (r) => r.url().endsWith('/api/sessions') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Save' }).click();
  expect((await post).status()).toBe(201);
  const dashboardRequests: string[] = [];
  page.on('request', (r) => {
    if (r.url().endsWith('/api/dashboard')) dashboardRequests.push(r.url());
  });

  await expect(page).toHaveURL('/app');
  await selectPeriod(page, 'This month');
  await expectCard(page, 'Compak Sporting', '17 / 13 / 25');
  await expect(card(page, 'Compak Sporting').getByTestId('count')).toHaveText('8');
  expect(await page.evaluate(() => (window as unknown as { marker?: number }).marker)).toBe(1);
  // The POST response already carried the new dashboard: no second request.
  await page.waitForLoadState('networkidle');
  expect(dashboardRequests).toEqual([]);
});

test('R5: A–F only for Compak Sporting and Sporting, cleared when switching', async ({ page }) => {
  await page.goto('/app/add');
  const targets = page.getByRole('group', { name: 'Hardest targets' });

  await page.getByText('Compak Sporting', { exact: true }).click();
  await expect(targets).toBeVisible();
  await targets.getByText('E', { exact: true }).click();
  await expect(targets.getByRole('checkbox', { name: 'E' })).toBeChecked();

  await page.getByText('Sporting', { exact: true }).click();
  await expect(targets).toBeVisible();
  await expect(targets.getByRole('checkbox', { name: 'E' })).not.toBeChecked();

  for (const name of ['Fosso', 'Trap', 'Helice']) {
    await page.getByText(name, { exact: true }).click();
    await expect(targets).toHaveCount(0);
  }
});

test('R6: a score outside 0–25 is rejected', async ({ page }) => {
  let posted = false;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/sessions') && r.method() === 'POST') posted = true;
  });
  await page.goto('/app/add');
  const score = page.getByLabel('Score (out of 25)');

  await score.fill('26');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toHaveText('Score must be a whole number from 0 to 25.');
  await expect(page).toHaveURL('/app/add');

  await score.fill('-1');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toHaveText('Score must be a whole number from 0 to 25.');

  // The stepper never leaves the range.
  await score.fill('25');
  await page.getByRole('button', { name: 'Increase score' }).click();
  await expect(score).toHaveValue('25');
  expect(posted).toBe(false);
});

test('R7: an API error on save keeps the form filled in', async ({ page }) => {
  await page.route('**/api/sessions', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({
          status: 500,
          json: { error: { code: 'INTERNAL_ERROR', message: 'Unexpected error', details: {} } },
        })
      : route.continue(),
  );
  await page.goto('/app/add');
  await page.getByText('Trap', { exact: true }).click();
  await page.getByLabel('Score (out of 25)').fill('21');
  await page.getByLabel('Notes').fill('Windy');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('alert')).toContainText('Could not save');
  await expect(page).toHaveURL('/app/add');
  await expect(page.getByRole('radio', { name: 'Trap' })).toBeChecked();
  await expect(page.getByLabel('Score (out of 25)')).toHaveValue('21');
  await expect(page.getByLabel('Notes')).toHaveValue('Windy');
});
