import { expect, OTHER, OWNER, seedSessions, test, type E2EUser } from './fixtures';

const ANA: E2EUser = { id: 'e2e-ana', email: 'ana@example.test', name: 'Ana Costa' };
const BRUNO: E2EUser = { id: 'e2e-bruno', email: 'bruno@example.test', name: 'Bruno Dias' };
const CARLA: E2EUser = { id: 'e2e-carla', email: 'carla@example.test', name: 'Carla Reis' };

const fosso = (date: string, ...scores: number[]) =>
  scores.map((score) => ({ date, discipline: 'fosso', score }));

/**
 * Fosso in October 2026 (the owner's history has none): Other and Ana both have two 25s, Other
 * has a 24 and Ana a 23, so Other wins. The reference date (Friday 2026-10-23) is in the week of
 * 19–25 October.
 */
test.beforeEach(async ({ request }) => {
  await seedSessions(request, OTHER, fosso('2026-10-21', 25, 25, 24));
  await seedSessions(request, ANA, [...fosso('2026-10-05', 25, 25), ...fosso('2026-10-22', 23)]);
  await seedSessions(request, BRUNO, fosso('2026-10-23', 25, 10));
  await seedSessions(request, OWNER, fosso('2026-10-20', 24));
  await seedSessions(request, CARLA, fosso('2026-09-30', 22));
});

async function openFosso(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Community' })
    .click();
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Fosso' });
}

test('R27: monthly ranking by default: podium for the top three, then the list with my row', async ({
  page,
}) => {
  await openFosso(page);
  await expect(page.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('period-label')).toHaveText('October 2026');
  await expect(page.getByRole('button', { name: 'Next period' })).toBeDisabled();

  await expect(page.getByTestId('podium-1')).toContainText('Other Shooter');
  await expect(page.getByTestId('podium-1')).toContainText('25 ×2');
  await expect(page.getByTestId('podium-2')).toContainText('Ana Costa');
  await expect(page.getByTestId('podium-3')).toContainText('Bruno Dias');

  const rows = page.getByTestId('ranking-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('4');
  await expect(rows.first()).toContainText('Test Owner');
  await expect(rows.first()).toContainText('You');
  await expect(rows.first()).toHaveAttribute('aria-current', 'true');
  // Carla shot on 30 September: not in October.
  await expect(page.getByText('Carla Reis')).toHaveCount(0);
});

test('R27: switching to week and day, and stepping back to earlier periods', async ({ page }) => {
  await openFosso(page);

  await page.getByRole('button', { name: 'Week' }).click();
  await expect(page.getByTestId('period-label')).toHaveText('19–25 Oct 2026');
  // Ana's two 25s were on 5 October: this week she only has a 23.
  await expect(page.getByTestId('podium-1')).toContainText('Other Shooter');
  await expect(page.getByTestId('podium-2')).toContainText('Bruno Dias');
  await expect(page.getByTestId('podium-3')).toContainText('Test Owner');

  await page.getByRole('button', { name: 'Day' }).click();
  await expect(page.getByTestId('period-label')).toHaveText('23 Oct 2026');
  await expect(page.getByTestId('podium-1')).toContainText('Bruno Dias');
  await expect(page.getByTestId('podium-2')).toHaveCount(0);

  await page.getByRole('button', { name: 'Month' }).click();
  await page.getByRole('button', { name: 'Previous period' }).click();
  await expect(page.getByTestId('period-label')).toHaveText('September 2026');
  await expect(page.getByTestId('podium-1')).toContainText('Carla Reis');
  await page.getByRole('button', { name: 'Previous period' }).click();
  await expect(page.getByTestId('period-label')).toHaveText('August 2026');
  await expect(page.getByText('No results for this period yet.')).toBeVisible();
});

test('R28: "Show me in the Community" off hides me from the ranking; the display name can change', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Account' }).click();
  await page.getByRole('menuitem', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  const name = page.getByLabel('Display name');
  await name.fill('Ace Owner');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Saved.')).toBeVisible();
  await expect(page.getByTestId('welcome')).toHaveText('Welcome, Ace');

  const toggle = page.getByRole('switch', { name: 'Show me in the Community' });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'false');

  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Community' })
    .click();
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Fosso' });
  await expect(page.getByTestId('podium-1')).toContainText('Other Shooter');
  await expect(page.getByText('Ace Owner')).toHaveCount(0);
  await expect(page.getByTestId('ranking-row')).toHaveCount(0);
  await expect(page.getByText('You are hidden from the Community')).toBeVisible();

  await page.getByRole('link', { name: 'Change in Settings' }).click();
  await page.getByRole('switch', { name: 'Show me in the Community' }).click();
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'Community' })
    .click();
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Fosso' });
  await expect(page.getByTestId('ranking-row').first()).toContainText('Ace Owner');
});
