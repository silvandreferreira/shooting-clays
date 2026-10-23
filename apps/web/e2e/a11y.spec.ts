import { expect, expectCard, seriousA11yViolations, test } from './fixtures';

test('R10: no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  expect(await seriousA11yViolations(page)).toEqual([]);

  await page.goto('/add');
  await expect(page.getByRole('heading', { name: 'Add session' })).toBeVisible();
  expect(await seriousA11yViolations(page)).toEqual([]);

  await page.goto('/history');
  await expect(page.getByTestId('session-item').first()).toBeVisible();
  expect(await seriousA11yViolations(page)).toEqual([]);
});
