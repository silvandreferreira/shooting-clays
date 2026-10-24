import { expect, expectCard, seriousA11yViolations, test } from './fixtures';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`R10: no serious accessibility violations (${colorScheme} mode)`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
    expect(await seriousA11yViolations(page)).toEqual([]);

    await page.goto('/add');
    await expect(page.getByRole('heading', { name: 'Add session' })).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);

    await page.goto('/history');
    await expect(page.getByTestId('session-item').first()).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);

    // The owner shot Compak Sporting in October: the podium has one shooter.
    await page.goto('/community');
    await expect(page.getByTestId('podium-1')).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);
  });
}
