import { expect, seriousA11yViolations, test } from './fixtures';

// The public site (src/site): prerendered pages in pt-PT at the root and in English under /en.
test.use({ signedInAs: null });

test('R40: public pages are prerendered for search engines, with their own title, description, canonical URL and languages', async ({
  request,
}) => {
  for (const [path, h1, canonical, other] of [
    ['/', 'Registe as suas séries de tiro aos pratos e supere-se', '/', '/en'],
    ['/en', 'Log your clay shooting series and beat your own best', '/en', '/'],
    ['/modalidades', 'Modalidades de tiro aos pratos', '/modalidades', '/en/disciplines'],
    ['/en/faq', 'Frequently asked questions', '/en/faq', '/faq'],
  ] as const) {
    // The HTML itself, before any JavaScript runs.
    const html = await (await request.get(path)).text();
    expect(html, path).toMatch(new RegExp(`<h1[^>]*>${h1}</h1>`));
    expect(html.match(/<h1[ >]/g), path).toHaveLength(1);
    expect(html, path).toMatch(/<title>[^<]+\| Shooting Clays<\/title>|<title>Shooting Clays — /);
    expect(html, path).toMatch(/<meta name="description" content="[^"]{50,}"/);
    expect(html, path).toContain(
      `<link rel="canonical" href="https://shooting-clays.vercel.app${canonical}" />`,
    );
    expect(html, path).toContain(`href="https://shooting-clays.vercel.app${other}" />`);
  }

  const app = await (await request.get('/app')).text();
  expect(app).toContain('<meta name="robots" content="noindex" />');
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /app');
  expect(robots).toContain('Sitemap: https://shooting-clays.vercel.app/sitemap.xml');
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap.match(/<loc>/g)).toHaveLength(6);
  expect(sitemap).not.toContain('/app');
});

test('R41: from the home page to the disciplines, the other language and the sign-in screen', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Registe as suas séries de tiro aos pratos e supere-se',
  );
  await expect(page.getByRole('heading', { name: 'Competitivo, mas saudável' })).toBeVisible();

  await page.getByRole('link', { name: 'Modalidades', exact: true }).first().click();
  await expect(page).toHaveURL('/modalidades');
  for (const name of ['Compak Sporting', 'Percurso de Caça', 'Fosso', 'Trap', 'Hélice']) {
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  }
  const trap = page.getByRole('row', { name: /^Trap/ });
  await expect(trap.getByRole('cell')).toHaveText(['5', 'Normalmente 3', '2', '25']);

  await page.getByRole('link', { name: 'English' }).click();
  await expect(page).toHaveURL('/en/disciplines');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Clay shooting disciplines');
  await page.getByRole('link', { name: 'Português' }).click();
  await expect(page).toHaveURL('/modalidades');

  // The browser is in English: the app opens in Portuguese because that was chosen on the site.
  await page.getByRole('link', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL('/app');
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible();
});

for (const colorScheme of ['light', 'dark'] as const) {
  test(`R41: no serious accessibility violations on the public pages (${colorScheme} mode)`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    for (const path of ['/', '/modalidades', '/faq', '/en']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await seriousA11yViolations(page), path).toEqual([]);
    }
  });
}
