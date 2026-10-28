import {
  accountItem,
  card,
  expect,
  expectCard,
  goTo,
  openAccountMenu,
  selectPeriod,
  test,
} from './fixtures';

test('R4: adding a session updates the dashboard without a reload', async ({ page }) => {
  await page.goto('/app');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  await goTo(page, 'Add');

  await expect(page.getByLabel('Date')).toHaveValue('2026-10-23');
  await expect(page.getByLabel('Club')).toHaveValue('ccm');
  await page.getByText('Compak Sporting', { exact: true }).click();
  await page.getByText('Field 2', { exact: true }).click();
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

test('R5: A–F only for Compak Sporting, cleared when switching', async ({ page }) => {
  await page.goto('/app/add');
  const targets = page.getByRole('group', { name: 'Hardest targets' });

  await page.getByText('Compak Sporting', { exact: true }).click();
  await expect(targets).toBeVisible();
  await targets.getByText('E', { exact: true }).click();
  await expect(targets.getByRole('checkbox', { name: 'E' })).toBeChecked();

  for (const name of ['Fosso', 'Helice']) {
    await page.getByText(name, { exact: true }).click();
    await expect(targets).toHaveCount(0);
  }
  await page.getByText('Compak Sporting', { exact: true }).click();
  await expect(targets.getByRole('checkbox', { name: 'E' })).not.toBeChecked();
});

test('R6: a score outside 0–25 is rejected', async ({ page }) => {
  let posted = false;
  page.on('request', (r) => {
    if (r.url().endsWith('/api/sessions') && r.method() === 'POST') posted = true;
  });
  await page.goto('/app/add');
  await page.getByText('Field 1', { exact: true }).click();
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
  await page.getByText('Fosso', { exact: true }).click();
  await page.getByText('Field 2', { exact: true }).click();
  await page.getByLabel('Score (out of 25)').fill('21');
  await page.getByLabel('Notes').fill('Windy');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByRole('alert')).toContainText('Could not save');
  await expect(page).toHaveURL('/app/add');
  await expect(page.getByRole('radio', { name: 'Fosso' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Field 2' })).toBeChecked();
  await expect(page.getByLabel('Score (out of 25)')).toHaveValue('21');
  await expect(page.getByLabel('Notes')).toHaveValue('Windy');
});

test('R49: club → discipline → field; History shows where; older series get a field when edited', async ({
  page,
}) => {
  await page.goto('/app/add');
  const fields = page.getByRole('group', { name: 'Field' });
  await expect(fields.getByRole('radio')).toHaveCount(4);
  // The app records Compak Sporting, Fosso and Helice only.
  await expect(page.getByRole('group', { name: 'Discipline' }).getByRole('radio')).toHaveCount(3);

  await page.getByText('Fosso', { exact: true }).click();
  await expect(fields.getByRole('radio')).toHaveCount(2);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('alert')).toHaveText('Choose the field.');
  await fields.getByText('Field 2', { exact: true }).click();
  await page.getByLabel('Score (out of 25)').fill('19');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL('/app');

  await goTo(page, 'History');
  const items = page.getByTestId('session-item');
  await expect(items.first().getByTestId('place')).toHaveText('CCM · Field 2');
  // The imported history is at CCM, field not recorded.
  await page
    .getByRole('combobox', { name: 'Discipline' })
    .selectOption({ label: 'Compak Sporting' });
  await expect(items.first().getByTestId('place')).toHaveText('CCM');

  await items.first().getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByLabel('Club')).toHaveValue('ccm');
  await expect(page.getByRole('radio', { name: 'No field' })).toBeChecked();
  await page.getByText('Field 3', { exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL('/app/history?discipline=compak');
  await expect(items.first().getByTestId('place')).toHaveText('CCM · Field 3');
});

test('R50: Clubs lists the fields and their disciplines; my club is in Settings', async ({
  page,
}) => {
  await page.goto('/app');
  await openAccountMenu(page);
  await accountItem(page, 'Clubs').click();
  await expect(page.getByRole('heading', { name: 'Clubs' })).toBeVisible();
  const ccm = page.getByRole('article', { name: 'CCM' });
  await expect(ccm).toContainText('Field 1Compak Sporting, Fosso, Helice');
  await expect(ccm).toContainText('Field 2Compak Sporting, Fosso');
  await expect(ccm).toContainText('Field 4Compak Sporting');
  // Not chosen yet: the first club is the user's club.
  await expect(ccm.getByText('Home club')).toBeVisible();

  await page.goto('/app/settings');
  const myClub = page.getByLabel('My club');
  await expect(myClub).toHaveValue('ccm');
  await expect(myClub.getByRole('option')).toHaveText(['CCM']);
});
