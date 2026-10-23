import { card, expect, expectCard, test } from './fixtures';

test('R8: editing and deleting in History updates the dashboard', async ({ page }) => {
  await page.goto('/history');
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Helice' });
  const items = page.getByTestId('session-item');
  await expect(items).toHaveCount(1);

  await items.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit session' })).toBeVisible();
  await page.getByLabel('Score (out of 25)').fill('10');
  await page.getByRole('button', { name: 'Save' }).click();
  // Back to History with the filter kept.
  await expect(page).toHaveURL('/history?discipline=helice');
  await expect(items).toHaveCount(1);
  await expect(items).toContainText('10/25');

  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expectCard(page, 'Helice', '10 / 10 / 10');

  await page.getByRole('link', { name: 'History' }).click();
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Helice' });
  page.once('dialog', (d) => void d.accept());
  await items.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('No sessions found.')).toBeVisible();

  await page.getByRole('link', { name: 'Dashboard' }).click();
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  await expect(card(page, 'Helice')).toHaveCount(0);
});
