import { card, expect, expectCard, goTo, test } from './fixtures';

test('R8: editing and deleting in History updates the dashboard', async ({ page }) => {
  await page.goto('/app/history');
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Helice' });
  const items = page.getByTestId('session-item');
  await expect(items).toHaveCount(1);

  await items.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit session' })).toBeVisible();
  await page.getByLabel('Score (out of 25)').fill('10');
  await page.getByRole('button', { name: 'Save' }).click();
  // Back to History with the filter kept.
  await expect(page).toHaveURL('/app/history?discipline=helice');
  await expect(items).toHaveCount(1);
  await expect(items).toContainText('10/25');

  await goTo(page, 'Dashboard');
  await expectCard(page, 'Helice', '10 / 10 / 10');

  await goTo(page, 'History');
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Helice' });
  page.once('dialog', (d) => void d.accept());
  await items.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('No sessions found.')).toBeVisible();

  await goTo(page, 'Dashboard');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  await expect(card(page, 'Helice')).toHaveCount(0);
});

test('R12: History shows hardest targets as "A, C and F", only when recorded', async ({ page }) => {
  await page.goto('/app/add');
  await page.getByText('Compak Sporting', { exact: true }).click();
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
