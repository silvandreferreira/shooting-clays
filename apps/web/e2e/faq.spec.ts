import { accountItem, expect, openAccountMenu, seriousA11yViolations, test } from './fixtures';

test('R36: the FAQ opens from the menu; each question expands to its answer', async ({ page }) => {
  await page.goto('/');
  await openAccountMenu(page);
  await accountItem(page, 'FAQ').click();
  await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible();

  const question = page.getByText('What do Day, Week and Month cover?');
  const answer = page.getByText('Week runs from Sunday to Saturday');
  await expect(answer).toBeHidden();
  await question.click();
  await expect(answer).toBeVisible();
  expect(await seriousA11yViolations(page)).toEqual([]);
});

test.describe('signed out', () => {
  test.use({ signedInAs: null });

  test('R36: the FAQ is public, in the chosen language, with a way back to sign in', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('group', { name: 'Language' })
      .getByRole('button', { name: 'Português' })
      .click();
    await page.getByRole('link', { name: 'Perguntas frequentes' }).click();
    await expect(page.getByRole('heading', { name: 'Perguntas frequentes' })).toBeVisible();
    await page.getByText('Como é feita a classificação da Comunidade?').click();
    await expect(page.getByText('mais séries de 24')).toBeVisible();

    await page.getByRole('link', { name: /Voltar ao início de sessão/ }).click();
    await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible();
  });
});
