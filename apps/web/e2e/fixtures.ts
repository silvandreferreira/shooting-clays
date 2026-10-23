import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

const API_URL = 'http://localhost:3100';

export const REFERENCE_DATE = new Date('2026-10-23T12:00:00Z');

/** Every test starts from the CSV history and a browser clock fixed at 2026-10-23. */
export const test = base.extend<{ resetData: void }>({
  resetData: [
    async ({ request, page }, use) => {
      const res = await request.post(`${API_URL}/api/__test__/reset`);
      expect(res.ok()).toBe(true);
      await page.clock.setFixedTime(REFERENCE_DATE);
      await use();
    },
    { auto: true },
  ],
});

export { expect };

export const card = (page: Page, name: string) => page.getByRole('article', { name, exact: true });

export async function expectCard(page: Page, name: string, values: string) {
  const [avg, min, max] = values === '—' ? ['—', '—', '—'] : values.split(' / ');
  const c = card(page, name);
  await expect(c.getByTestId('avg')).toHaveText(avg!);
  await expect(c.getByTestId('min')).toHaveText(min!);
  await expect(c.getByTestId('max')).toHaveText(max!);
}

export async function selectPeriod(page: Page, period: 'All time' | 'Last month' | 'This month') {
  await page.getByRole('button', { name: period }).click();
  await expect(page.getByRole('button', { name: period })).toHaveAttribute('aria-pressed', 'true');
}

export async function seriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`);
}
