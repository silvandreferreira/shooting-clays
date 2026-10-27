import { expect, expectCard, selectPeriod, test, card } from './fixtures';

// R1: reference values from docs/testing.md.
const REFERENCE = {
  'All time': {
    'Compak Sporting': '16 / 8 / 23',
    Fosso: '10 / 5 / 16',
    Helice: '4 / 4 / 4',
    Trap: '17 / 15 / 19',
  },
  'Last month': {
    'Compak Sporting': '18 / 14 / 23',
    Fosso: '10 / 5 / 16',
    Helice: '4 / 4 / 4',
    Trap: '—',
  },
  'This month': {
    'Compak Sporting': '16 / 13 / 18',
    Fosso: '—',
    Helice: '—',
    Trap: '17 / 15 / 19',
  },
} as const;

test('R1: dashboard shows the reference values for all three periods', async ({ page }) => {
  await page.goto('/');
  for (const [period, cards] of Object.entries(REFERENCE)) {
    await selectPeriod(page, period as keyof typeof REFERENCE);
    for (const [name, values] of Object.entries(cards)) {
      await expectCard(page, name, values);
    }
  }
});

test('R2: a period without data shows "—", never 0', async ({ page }) => {
  await page.goto('/');
  await selectPeriod(page, 'This month');
  const fosso = card(page, 'Fosso');
  await expect(fosso.getByTestId('avg')).toHaveText('—');
  await expect(fosso.getByTestId('count')).toHaveText('0');
  // Disciplines never shot do not get a card.
  await expect(card(page, 'Sporting')).toHaveCount(0);
});

test('R24: tapping a discipline in the scores chart legend hides its line; tapping again shows it', async ({
  page,
}) => {
  await page.goto('/');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  const chart = page.getByRole('img', { name: 'Scores over time' });
  const legend = page.getByRole('group', { name: 'Disciplines shown in the chart' });
  const lines = chart.locator('.recharts-line');
  await expect(lines).toHaveCount(4);
  for (const button of await legend.getByRole('button').all()) {
    await expect(button).toHaveAttribute('aria-pressed', 'true');
  }

  const fosso = legend.getByRole('button', { name: 'Fosso' });
  await fosso.click();
  await expect(fosso).toHaveAttribute('aria-pressed', 'false');
  await expect(lines).toHaveCount(3);
  await legend.getByRole('button', { name: 'Trap' }).click();
  await expect(lines).toHaveCount(2);

  await fosso.click();
  await expect(fosso).toHaveAttribute('aria-pressed', 'true');
  await expect(lines).toHaveCount(3);

  // Per visit: everything is shown again after a reload.
  await page.reload();
  await expect(lines).toHaveCount(4);
});

test('R25: each bar of "Average by discipline" shows the average and the lowest–highest score', async ({
  page,
}) => {
  await page.goto('/');
  const range = (d: string) => page.getByTestId(`range-${d}`);
  await expect(range('compak')).toHaveText('168–23');
  await expect(range('fosso')).toHaveText('105–16');
  await expect(range('trap')).toHaveText('1715–19');
  await expect(range('helice')).toHaveText('44–4');

  await selectPeriod(page, 'This month');
  await expect(range('compak')).toHaveText('1613–18');
  await expect(range('fosso')).toHaveCount(0);
});

test('R29: the scores chart has its own time range, 3 months by default', async ({ page }) => {
  await page.goto('/');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  const ranges = page.getByRole('group', { name: 'Time range of the chart' });
  const dots = page.getByRole('img', { name: 'Scores over time' }).locator('.recharts-line-dot');
  const dotsFor = async (range: string) => {
    await ranges.getByRole('button', { name: range }).click();
    await expect(ranges.getByRole('button', { name: range })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    return dots.count();
  };

  await expect(ranges.getByRole('button', { name: '3 months' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const threeMonths = await dots.count();
  expect(threeMonths).toBeGreaterThan(0);
  const sixMonths = await dotsFor('6 months');
  // The first series (2026-04-12) is before 2026-04-23: only from 1 year.
  const oneYear = await dotsFor('1 year');
  const allTime = await dotsFor('All time');
  expect(sixMonths).toBeGreaterThan(threeMonths);
  expect(oneYear).toBeGreaterThan(sixMonths);
  expect(allTime).toBe(oneYear);

  // The Dashboard period still drives the cards, not the chart.
  await selectPeriod(page, 'This month');
  await expect(ranges.getByRole('button', { name: 'All time' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await dots.count()).toBe(allTime);

  // Per visit: back to 3 months after a reload.
  await page.reload();
  await expect(ranges.getByRole('button', { name: '3 months' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('R39: the Dashboard shows the scores chart first, then the averages, then the cards', async ({
  page,
}) => {
  await page.goto('/');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  const top = async (locator: import('@playwright/test').Locator) =>
    (await locator.boundingBox())!.y;
  const scores = await top(page.getByRole('heading', { name: /Scores over time/ }));
  const averages = await top(page.getByRole('heading', { name: /Average by discipline/ }));
  const firstCard = await top(page.getByRole('article').first());
  expect(scores).toBeLessThan(averages);
  expect(averages).toBeLessThan(firstCard);
});
