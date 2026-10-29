import { accountItem, expect, openAccountMenu, seriousA11yViolations, test } from './fixtures';

test('R36: the FAQ opens from the menu; each question expands to its answer', async ({ page }) => {
  await page.goto('/app');
  await openAccountMenu(page);
  await accountItem(page, 'FAQ').click();
  await expect(page.getByRole('heading', { name: 'Frequently asked questions' })).toBeVisible();

  const question = page.getByText('Which results count in the Community?');
  const answer = page.getByText('All fields count by default');
  await expect(answer).toBeHidden();
  await question.click();
  await expect(answer).toBeVisible();
  expect(await seriousA11yViolations(page)).toEqual([]);
});

test.describe('signed out', () => {
  test.use({ signedInAs: null });

  test('R36: the sign-in screen links to the public FAQ in the chosen language', async ({
    page,
  }) => {
    await page.goto('/app');
    await page
      .getByRole('group', { name: 'Language' })
      .getByRole('button', { name: 'Português' })
      .click();
    await page.getByRole('link', { name: 'Perguntas frequentes' }).click();
    await expect(page).toHaveURL('/faq');
    await expect(page.getByRole('heading', { name: 'Perguntas frequentes' })).toBeVisible();
    await page.getByText('Como é feita a classificação da Comunidade?').click();
    await expect(page.getByText('mais séries de 24')).toBeVisible();

    await page.getByRole('link', { name: 'Entrar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Entrar com Google' })).toBeVisible();
  });
});
