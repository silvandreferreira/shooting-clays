import { card, expect, expectCard, goTo, selectPeriod, test } from './fixtures';

test('R8: editing and deleting in History updates the dashboard', async ({ page }) => {
  await page.goto('/app/history');
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Helice' });
  // The Helice series is from September: not in This month (the default).
  await page.getByRole('button', { name: 'All time' }).click();
  const items = page.getByTestId('session-item');
  await expect(items).toHaveCount(1);

  await items.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit session' })).toBeVisible();
  await page.getByLabel('Score (out of 25)').fill('10');
  await page.getByRole('button', { name: 'Save' }).click();
  // Back to History with the filters kept.
  await expect(page).toHaveURL('/app/history?discipline=helice&period=allTime');
  await expect(items).toHaveCount(1);
  await expect(items).toContainText('10/25');

  await goTo(page, 'Dashboard');
  await selectPeriod(page, 'Last month');
  await expectCard(page, 'Helice', '10 / 10 / 10');

  await goTo(page, 'History');
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Helice' });
  await page.getByRole('button', { name: 'All time' }).click();
  await expect(items).toHaveCount(1);
  page.once('dialog', (d) => void d.accept());
  await items.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('No sessions found.')).toBeVisible();

  await goTo(page, 'Dashboard');
  await expectCard(page, 'Compak Sporting', '16 / 13 / 18');
  await expect(card(page, 'Helice')).toHaveCount(0);
});

test('R12: History shows hardest targets as "A, C and F", only when recorded', async ({ page }) => {
  await page.goto('/app/add');
  await page.getByText('Compak Sporting', { exact: true }).click();
  await page.getByText('Field 4', { exact: true }).click();
  const targets = page.getByRole('group', { name: 'Hardest targets' });
  for (const letter of ['F', 'A', 'C']) await targets.getByText(letter, { exact: true }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL('/app');

  await goTo(page, 'History');
  const newest = page.getByTestId('session-item').first();
  await expect(newest.getByTestId('hardest-targets')).toHaveText('Hardest targets: A, C and F');

  // Sessions without hardest targets (e.g. imported history, Fosso) have no label.
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Fosso' });
  await expect(page.getByTestId('session-item').first()).toBeVisible();
  await expect(page.getByTestId('hardest-targets')).toHaveCount(0);
});

test('R56: History shows this month by default, then last month or all time; kept in the address', async ({
  page,
}) => {
  await page.goto('/app');
  await goTo(page, 'History');
  const periods = page.getByRole('group', { name: 'Period' });
  await expect(periods.getByRole('button')).toHaveText(['This month', 'Last month', 'All time']);
  await expect(periods.getByRole('button', { name: 'This month' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const items = page.getByTestId('session-item');
  // The month of each item ("23 Oct 2026"; September is "Sept" in some browsers).
  const months = async () =>
    (await items.allTextContents()).map((t) => /\d+ (\w{3})\w* 2026/.exec(t)?.[1]);
  await expect(items.first()).toBeVisible();
  const thisMonth = await items.count();
  expect(new Set(await months())).toEqual(new Set(['Oct']));

  await periods.getByRole('button', { name: 'Last month' }).click();
  await expect(items.first()).toContainText(/Sept? 2026/);
  expect(new Set(await months())).toEqual(new Set(['Sep']));

  await periods.getByRole('button', { name: 'All time' }).click();
  await expect(items.last()).toContainText('Apr 2026');
  expect(await items.count()).toBeGreaterThan(thisMonth);

  // With a discipline too, and both survive a reload.
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Helice' });
  await expect(items).toHaveCount(1);
  await page.reload();
  await expect(periods.getByRole('button', { name: 'All time' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(items).toHaveCount(1);
});
