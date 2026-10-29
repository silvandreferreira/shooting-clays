import {
  accountItem,
  expect,
  goTo,
  openAccountMenu,
  OTHER,
  OWNER,
  seedSessions,
  test,
  type E2EUser,
} from './fixtures';

const ANA: E2EUser = { id: 'e2e-ana', email: 'ana@example.test', name: 'Ana Costa' };
const BRUNO: E2EUser = { id: 'e2e-bruno', email: 'bruno@example.test', name: 'Bruno Dias' };
const CARLA: E2EUser = { id: 'e2e-carla', email: 'carla@example.test', name: 'Carla Reis' };

const fosso = (date: string, ...scores: number[]) =>
  scores.map((score) => ({ date, discipline: 'fosso', score }));
const onField2 = (sessions: ReturnType<typeof fosso>) =>
  sessions.map((s) => ({ ...s, fieldId: '2' }));

/**
 * Fosso at CCM in October 2026 (the owner's history has 15, 19 and 18 on the 13th, 17th and 23rd
 * without a field, the former Trap series, decision #68): Other and Ana both have two 25s, Other
 * has a 24 and Ana a 23, so Other wins. Everyone shot on Field 1 except Bruno, on Field 2 (where
 * the owner's history is too).
 */
test.beforeEach(async ({ request }) => {
  await seedSessions(request, OTHER, fosso('2026-10-21', 25, 25, 24));
  await seedSessions(request, ANA, [...fosso('2026-10-05', 25, 25), ...fosso('2026-10-22', 23)]);
  await seedSessions(request, BRUNO, onField2(fosso('2026-10-23', 25, 10)));
  await seedSessions(request, OWNER, fosso('2026-10-20', 24));
  await seedSessions(request, CARLA, fosso('2026-09-30', 22));
});

async function openFosso(page: import('@playwright/test').Page) {
  await page.goto('/app');
  await goTo(page, 'Community');
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Fosso' });
}

test('R27: monthly ranking by default: podium for the top three, then the list with my row', async ({
  page,
}) => {
  await openFosso(page);
  await expect(page.getByTestId('period-label')).toHaveText('October 2026');
  await expect(page.getByRole('button', { name: 'Next month' })).toBeDisabled();

  await expect(page.getByTestId('podium-1')).toContainText('Other Shooter');
  // Only the best score shows; how many times it was reached only breaks ties.
  await expect(page.getByTestId('podium-1')).toContainText('25');
  await expect(page.getByTestId('podium-1')).not.toContainText('×');
  await expect(page.getByTestId('podium-2')).toContainText('Ana Costa');
  await expect(page.getByTestId('podium-3')).toContainText('Bruno Dias');

  const rows = page.getByTestId('ranking-row');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('4');
  await expect(rows.first()).toContainText('Test Owner');
  await expect(rows.first()).toContainText('You');
  await expect(rows.first()).toHaveAttribute('aria-current', 'true');
  // Only the name and the best score: no number of series.
  await expect(rows.first()).not.toContainText('series');
  // Carla shot on 30 September: not in October.
  await expect(page.getByText('Carla Reis')).toHaveCount(0);

  // Gold, silver and bronze for the first three; none in the list.
  for (const place of ['1', '2', '3']) {
    await expect(page.getByTestId(`podium-${place}`).getByTestId('medal')).toHaveText(place);
  }
  await expect(rows.getByTestId('medal')).toHaveCount(0);

  // The tie-break rules live only in the FAQ: no sentence or link here.
  await expect(page.getByText('Most series at 25')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /ranking/i })).toHaveCount(0);
});

test('R53: club → discipline → field (every field by default), the month only, stepping back', async ({
  page,
}) => {
  await page.goto('/app');
  await goTo(page, 'Community');
  const club = page.getByRole('combobox', { name: 'Club' });
  const discipline = page.getByRole('combobox', { name: 'Discipline' });
  const field = page.getByRole('combobox', { name: 'Field' });
  await expect(club).toHaveValue('ccm');
  await expect(discipline.getByRole('option')).toHaveText(['Compak Sporting', 'Fosso', 'Helice']);
  await expect(field.getByRole('option')).toHaveText([
    'All fields',
    'Field 1',
    'Field 2',
    'Field 3',
    'Field 4',
  ]);
  // No day or week any more.
  for (const name of ['Day', 'Week', 'Month']) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
  }

  await discipline.selectOption({ label: 'Fosso' });
  await expect(field).toHaveValue('');
  await expect(field.getByRole('option')).toHaveText(['All fields', 'Field 1', 'Field 2']);
  await field.selectOption({ label: 'Field 2' });
  // Bruno, and the owner's imported Fosso (on Field 2, decision #72).
  await expect(page.getByTestId('podium-1')).toContainText('Bruno Dias');
  await expect(page.getByTestId('podium-2')).toContainText('Test Owner');
  await expect(page.getByTestId('podium-3')).toHaveCount(0);

  // Field 2 has no Helice: back to every field.
  await discipline.selectOption({ label: 'Helice' });
  await expect(field).toHaveValue('');
  await expect(field.getByRole('option')).toHaveText(['All fields', 'Field 1']);

  await discipline.selectOption({ label: 'Fosso' });
  await field.selectOption({ label: 'Field 1' });
  await expect(page.getByTestId('podium-1')).toContainText('Other Shooter');
  await expect(page.getByTestId('podium-2')).toContainText('Ana Costa');
  await expect(page.getByTestId('podium-3')).toContainText('Test Owner');
  await expect(page.getByText('Bruno Dias')).toHaveCount(0);

  // The choices are in the address: a reload keeps them.
  await page.reload();
  await expect(field).toHaveValue('1');
  await expect(page.getByTestId('podium-3')).toContainText('Test Owner');

  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByTestId('period-label')).toHaveText('September 2026');
  await expect(page.getByTestId('podium-1')).toContainText('Carla Reis');
  await page.getByRole('button', { name: 'Previous month' }).click();
  await expect(page.getByTestId('period-label')).toHaveText('August 2026');
  await expect(page.getByText('No results this month yet.')).toBeVisible();
});

test('R28: "Show me in the Community" off hides me from the ranking; the display name can change', async ({
  page,
}) => {
  await page.goto('/app');
  await openAccountMenu(page);
  await accountItem(page, 'Settings').click();
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

  await goTo(page, 'Community');
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Fosso' });
  await expect(page.getByTestId('podium-1')).toContainText('Other Shooter');
  await expect(page.getByText('Ace Owner')).toHaveCount(0);
  await expect(page.getByTestId('ranking-row')).toHaveCount(0);
  await expect(page.getByText('You are hidden from the Community')).toBeVisible();

  await page.getByRole('link', { name: 'Change in Settings' }).click();
  await page.getByRole('switch', { name: 'Show me in the Community' }).click();
  await goTo(page, 'Community');
  await page.getByRole('combobox', { name: 'Discipline' }).selectOption({ label: 'Fosso' });
  await expect(page.getByTestId('ranking-row').first()).toContainText('Ace Owner');
});
