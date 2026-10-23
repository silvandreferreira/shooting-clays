import { expect, expectCard, test } from './fixtures';

test('R3: with the API down, the dashboard opens from the persisted cache', async ({ page }) => {
  await page.goto('/');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  // Wait until the persister has written the cache to IndexedDB (it is throttled).
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            const open = indexedDB.open('keyval-store');
            open.onsuccess = () => {
              const get = open.result
                .transaction('keyval')
                .objectStore('keyval')
                .get('shooting-clays-cache');
              get.onsuccess = () =>
                resolve(typeof get.result === 'string' && get.result.includes('compak'));
              get.onerror = () => resolve(false);
            };
            open.onerror = () => resolve(false);
          }),
      ),
    )
    .toBe(true);

  await page.route('**/api/**', (route) => route.abort('connectionrefused'));
  await page.reload();
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  await expect(page.getByText('Loading…')).toHaveCount(0);
});
