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
