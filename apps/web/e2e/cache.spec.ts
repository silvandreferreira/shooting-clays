import { expect, expectCard, test } from './fixtures';

test('R3: offline (API and auth down), the dashboard opens from the persisted cache', async ({
  page,
}) => {
  await page.goto('/app');
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

  // Offline: neither the API nor Neon Auth can be reached.
  await page.route('**/api/**', (route) => route.abort('connectionrefused'));
  await page.route('**/auth/**', (route) => route.abort('connectionrefused'));
  await page.reload();
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  await expect(page.getByText('Loading…')).toHaveCount(0);
});
