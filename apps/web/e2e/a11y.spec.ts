import { API_URL, expect, expectCard, seriousA11yViolations, test } from './fixtures';

for (const colorScheme of ['light', 'dark'] as const) {
  test(`R10: no serious accessibility violations (${colorScheme} mode)`, async ({
    page,
    request,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/app');
    await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
    expect(await seriousA11yViolations(page)).toEqual([]);

    await page.goto('/app/add');
    await expect(page.getByRole('heading', { name: 'Add session' })).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);

    await page.goto('/app/history');
    await expect(page.getByTestId('session-item').first()).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);

    // The owner shot Compak Sporting in October: the podium has one shooter.
    await page.goto('/app/community');
    await expect(page.getByTestId('podium-1')).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);

    await page.goto('/app/settings');
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    expect(await seriousA11yViolations(page)).toEqual([]);

    // An unread contact message for the admin.
    const data = { name: 'Ana', email: 'ana@example.test', message: 'Hello there!', locale: 'en' };
    expect((await request.post(`${API_URL}/api/contact`, { data })).ok()).toBe(true);
    await page.goto('/app/notifications');
    await expect(page.getByTestId('notification')).toContainText('Message from Ana');
    expect(await seriousA11yViolations(page)).toEqual([]);
  });
}

test.describe('in Portuguese', () => {
  test.use({ locale: 'pt-PT' });

  test('R10: no serious accessibility violations (pt-PT)', async ({ page }) => {
    await page.goto('/app');
    await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
    expect(await seriousA11yViolations(page)).toEqual([]);

    for (const [path, heading] of [
      ['/app/add', 'Adicionar sessão'],
      ['/app/history', 'Histórico'],
      ['/app/community', 'Comunidade'],
      ['/app/settings', 'Definições'],
    ] as const) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();
      expect(await seriousA11yViolations(page)).toEqual([]);
    }
  });
});
