import { existsSync } from 'node:fs';
import type { TestInfo } from '@playwright/test';
import { expect, expectCard, test } from './fixtures';

// R9. Baselines are generated on Linux (as in CI) by the "Update snapshots" workflow;
// font rendering differs on other systems, so the comparison only runs on Linux.
test.skip(process.platform !== 'linux', 'Visual baselines are Linux-only (see docs/testing.md)');

/** Until the "Update snapshots" workflow has created a baseline, there is nothing to compare. */
function skipWithoutBaseline(testInfo: TestInfo, name: string) {
  // `--update-snapshots` means 'changed' (or 'all'): then a missing baseline is written, not skipped.
  const updating = ['all', 'changed'].includes(testInfo.config.updateSnapshots);
  test.skip(
    !updating && !existsSync(testInfo.snapshotPath(name)),
    `No baseline for ${name}: run the "Update snapshots" workflow`,
  );
}

test('R9: dashboard looks the same', async ({ page }, testInfo) => {
  skipWithoutBaseline(testInfo, 'dashboard.png');
  await page.goto('/app');
  await expectCard(page, 'Compak Sporting', '16 / 13 / 18');
  await expect(page).toHaveScreenshot('dashboard.png', { fullPage: true });
});

test('R9: add screen looks the same', async ({ page }, testInfo) => {
  skipWithoutBaseline(testInfo, 'add.png');
  await page.goto('/app/add');
  await expect(page.getByRole('heading', { name: 'Add session' })).toBeVisible();
  await expect(page).toHaveScreenshot('add.png', { fullPage: true });
});

test.describe('in Portuguese', () => {
  test.use({ locale: 'pt-PT' });

  test('R9: dashboard in pt-PT looks the same', async ({ page }, testInfo) => {
    skipWithoutBaseline(testInfo, 'dashboard-pt-PT.png');
    await page.goto('/app');
    await expectCard(page, 'Compak Sporting', '16 / 13 / 18');
    await expect(page).toHaveScreenshot('dashboard-pt-PT.png', { fullPage: true });
  });
});
