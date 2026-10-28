import {
  accountItem,
  expect,
  expectCard,
  goTo,
  mainNav,
  openAccountMenu,
  OWNER,
  test,
} from './fixtures';

test('R30: switching to Português in Settings translates the app at once, without a reload', async ({
  page,
}) => {
  await page.goto('/app');
  await expectCard(page, 'Compak Sporting', '16 / 8 / 23');
  let reloaded = false;
  page.on('load', () => (reloaded = true));

  await openAccountMenu(page);
  await accountItem(page, 'Settings').click();
  const languages = page.getByRole('group', { name: 'Language' });
  await expect(languages.getByRole('button', { name: 'English' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await languages.getByRole('button', { name: 'Português' }).click();

  await expect(page.getByRole('heading', { name: 'Definições' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
  await expect(page.getByTestId('welcome')).toHaveText('Olá, Test');
  expect(reloaded).toBe(false);

  await goTo(page, 'Painel');
  await expect(page.getByRole('heading', { name: 'Painel' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Período' })).toContainText('Desde sempre');
  await expect(page.getByRole('heading', { name: /Resultados ao longo do tempo/ })).toBeVisible();

  await goTo(page, 'Adicionar');
  await expect(page.getByRole('heading', { name: 'Adicionar sessão' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Hélice' })).toBeVisible();

  await goTo(page, 'Histórico');
  await expect(page.getByRole('heading', { name: 'Histórico' })).toBeVisible();
  // Dates and lists follow the language; the imported notes stay as they are.
  await expect(page.getByTestId('session-item').first()).toContainText('out. 2026');
});

test('R31: the language is kept after a reload, before sign-in and on a new device', async ({
  page,
  auth,
}) => {
  await page.goto('/app/settings');
  await page
    .getByRole('group', { name: 'Language' })
    .getByRole('button', { name: 'Português' })
    .click();
  await expect(page.getByRole('heading', { name: 'Definições' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Definições' })).toBeVisible();

  // Signed out: this device remembers the choice.
  await openAccountMenu(page, 'Conta');
  await accountItem(page, 'Terminar sessão').click();
  await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible();

  // A new device (nothing stored) in English: the profile brings Portuguese back after sign-in.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  auth.user = OWNER;
  await page.reload();
  await expect(page.getByTestId('welcome')).toHaveText('Olá, Test');
  await expect((await mainNav(page)).getByRole('link', { name: 'Painel' })).toBeVisible();
});

test.describe('browser in Portuguese', () => {
  test.use({ locale: 'pt-PT', signedInAs: null });

  test('R32: a Portuguese browser starts in pt-PT; English can be chosen before signing in', async ({
    page,
  }) => {
    await page.goto('/app');
    await expect(page.locator('html')).toHaveAttribute('lang', 'pt-PT');
    await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible();

    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
  });
});

test.describe('validation and API errors', () => {
  test.use({ locale: 'pt-PT' });

  test('R33: form validation and API error messages appear in the active language', async ({
    page,
  }) => {
    await page.goto('/app/add');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('alert')).toHaveText('Escolha o campo.');
    await page.getByText('Campo 1', { exact: true }).click();
    const score = page.getByLabel('Resultado (em 25)');
    await score.fill('26');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'O resultado tem de ser um número inteiro de 0 a 25.',
    );

    await page.route('**/api/sessions', (route) =>
      route.fulfill({
        status: 500,
        json: { error: { code: 'INTERNAL_ERROR', message: 'Unexpected error', details: {} } },
      }),
    );
    await score.fill('21');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('alert')).toContainText('Não foi possível guardar');
    await expect(page.getByRole('alert')).toContainText('Ocorreu um erro no servidor.');
  });
});
