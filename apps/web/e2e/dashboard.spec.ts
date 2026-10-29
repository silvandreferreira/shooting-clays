import { expect, expectCard, selectPeriod, test, card } from './fixtures';

// R1: reference values from docs/testing.md.
const REFERENCE = {
  'All time': {
    'Compak Sporting': '16 / 8 / 23',
    Fosso: '12 / 5 / 19',
    Helice: '4 / 4 / 4',
  },
  'Last month': {
    'Compak Sporting': '18 / 14 / 23',
    Fosso: '10 / 5 / 16',
    Helice: '4 / 4 / 4',
  },
  'This month': {
    'Compak Sporting': '16 / 13 / 18',
    Fosso: '17 / 15 / 19',
    Helice: '—',
  },
} as const;

test('R1: dashboard shows the reference values for all three periods', async ({ page }) => {
  await page.goto('/app');
  for (const [period, cards] of Object.entries(REFERENCE)) {
    await selectPeriod(page, period as keyof typeof REFERENCE);
    for (const [name, values] of Object.entries(cards)) {
      await expectCard(page, name, values);
    }
  }
});

test('R2: a period without data shows "—", never 0', async ({ page }) => {
  await page.goto('/app');
  await selectPeriod(page, 'This month');
  const helice = card(page, 'Helice');
  await expect(helice.getByTestId('avg')).toHaveText('—');
  await expect(helice.getByTestId('count')).toHaveText('0');
  // Disciplines the app does not record (decision #68) have no card.
  await expect(card(page, 'Trap')).toHaveCount(0);
});

test('R24: tapping a discipline in the scores chart legend hides its line; tapping again shows it', async ({
  page,
}) => {
  await page.goto('/app');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  const chart = page.getByRole('img', { name: 'Scores over time' });
  const legend = page.getByRole('group', { name: 'Disciplines shown in the chart' });
  const lines = chart.locator('.recharts-line');
  await expect(lines).toHaveCount(3);
  for (const button of await legend.getByRole('button').all()) {
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  const fosso = legend.getByRole('button', { name: 'Fosso' });
  await fosso.click();
  await expect(fosso).toHaveAttribute('aria-pressed', 'false');
  await expect(lines).toHaveCount(2);
  await legend.getByRole('button', { name: 'Helice' }).click();
  await expect(lines).toHaveCount(1);

  await fosso.click();
  await expect(fosso).toHaveAttribute('aria-pressed', 'true');
  await expect(lines).toHaveCount(2);

  // Per visit: everything is shown again after a reload.
  await page.reload();
  await expect(lines).toHaveCount(3);
});

test('R25: each bar of "Average by discipline" shows the average and the lowest–highest score', async ({
  page,
}) => {
  await page.goto('/app');
  const range = (d: string) => page.getByTestId(`range-${d}`);
  await expect(range('compak')).toHaveText('168–23');
  await expect(range('fosso')).toHaveText('125–19');
  await expect(range('helice')).toHaveText('44–4');

  await selectPeriod(page, 'This month');
  await expect(range('compak')).toHaveText('1613–18');
  await expect(range('fosso')).toHaveText('1715–19');
  await expect(range('helice')).toHaveCount(0);
});

test('R29: the scores chart follows the Dashboard period, with no range of its own', async ({
  page,
}) => {
  await page.goto('/app');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  await expect(page.getByRole('button', { name: '3 months' })).toHaveCount(0);
  const dots = page.getByRole('img', { name: 'Scores over time' }).locator('.recharts-line-dot');
  // One point per series: as many as the cards count in each period.
  for (const period of ['All time', 'Last month', 'This month'] as const) {
    await selectPeriod(page, period);
    let series = 0;
    for (const count of await page.getByRole('article').getByTestId('count').allTextContents()) {
      series += Number(count);
    }
    expect(series).toBeGreaterThan(0);
    await expect(dots).toHaveCount(series);
  }
});

test('R52: the Dashboard is for a club (the home club first); "Consider fields" splits it per field', async ({
  page,
}) => {
  await page.goto('/app');
  const club = page.getByLabel('Club');
  const byField = page.getByRole('switch', { name: 'Consider fields' });
  await expect(club).toHaveValue('ccm');
  await expect(club.getByRole('option')).toHaveText(['CCM', 'All clubs']);
  await expect(byField).toHaveAttribute('aria-checked', 'false');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');

  // Two new series on Fields 2 and 3; the imported history is on Fields 4 (Compak) and 2 (Fosso).
  for (const [field, score] of [
    ['Field 2', '25'],
    ['Field 3', '21'],
  ] as const) {
    await page.goto('/app/add');
    await page.getByText(field, { exact: true }).click();
    await page.getByLabel('Score (out of 25)').fill(score);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL('/app');
  }

  await byField.click();
  await expect(byField).toHaveAttribute('aria-checked', 'true');
  await expect(card(page, 'Compak Sporting')).toHaveCount(0);
  await expectCard(page, 'Compak Sporting · Field 2', '25 / 25 / 25');
  await expectCard(page, 'Compak Sporting · Field 3', '21 / 21 / 21');
  // The imported history: Compak Sporting on Field 4, Fosso on Field 2.
  await expectCard(page, 'Compak Sporting · Field 4', '16 / 8 / 23');
  await expectCard(page, 'Fosso · Field 2', '12 / 5 / 19');
  await expect(page.getByRole('list', { name: 'Fields' }).getByRole('listitem')).toHaveText([
    'Field 1',
    'Field 2',
    'Field 3',
    'Field 4',
  ]);
  await expect(page.getByTestId('range-compak-2')).toContainText('25');
  await expect(page.getByTestId('range-compak-4')).toContainText('16');

  // Kept on this device.
  await page.reload();
  await expect(byField).toHaveAttribute('aria-checked', 'true');
  await expectCard(page, 'Compak Sporting · Field 2', '25 / 25 / 25');

  // Every club: one card per discipline again, no switch.
  await club.selectOption('All clubs');
  await expect(byField).toHaveCount(0);
  await expect(card(page, 'Compak Sporting')).toBeVisible();
  await expect(card(page, 'Compak Sporting · Field 2')).toHaveCount(0);
});

test('R39: the Dashboard shows the scores chart first, then the averages, then the cards', async ({
  page,
}) => {
  await page.goto('/app');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  const top = async (locator: import('@playwright/test').Locator) =>
    (await locator.boundingBox())!.y;
  const scores = await top(page.getByRole('heading', { name: /Scores over time/ }));
  const averages = await top(page.getByRole('heading', { name: /Average by discipline/ }));
  const firstCard = await top(page.getByRole('article').first());
  expect(scores).toBeLessThan(averages);
  expect(averages).toBeLessThan(firstCard);
});
