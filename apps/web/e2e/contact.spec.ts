import { API_URL, expect, test } from './fixtures';

test.use({ signedInAs: null });

test('R45: the contact form sends a message from the public site, after checking the fields', async ({
  page,
  request,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Contactos' }).first().click();
  await expect(page).toHaveURL('/contactos');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contactos');

  // Empty or invalid fields are pointed out in the page's language; nothing is sent.
  const send = page.getByRole('button', { name: 'Enviar mensagem' });
  await expect(send).toBeEnabled();
  await page.getByLabel('Email').fill('ana@');
  await send.click();
  await expect(page.getByText('Escreva o seu nome.')).toBeVisible();
  await expect(page.getByText('Escreva um endereço de email válido.')).toBeVisible();
  await expect(page.getByText('Escreva pelo menos 10 caracteres.')).toBeVisible();
  await expect(page.getByLabel('Nome')).toBeFocused();

  await page.getByLabel('Nome').fill('Ana Silva');
  await page.getByLabel('Email').fill('ana@example.test');
  await page.getByLabel('Mensagem').fill('Podem acrescentar o Fosso Olímpico?');
  await send.click();
  await expect(page.getByRole('status')).toHaveText(
    'Obrigado! A sua mensagem foi enviada. Receberá resposta por email.',
  );

  const outbox = await (await request.get(`${API_URL}/api/__test__/outbox`)).json();
  expect(outbox).toEqual([
    {
      name: 'Ana Silva',
      email: 'ana@example.test',
      message: 'Podem acrescentar o Fosso Olímpico?',
      locale: 'pt-PT',
    },
  ]);
});

test('R45: in English, a failed send says so and keeps the message', async ({ page }) => {
  await page.route('**/api/contact', (route) =>
    route.fulfill({ status: 429, json: { error: { code: 'RATE_LIMITED' } } }),
  );
  await page.goto('/en/contact');
  await page.getByLabel('Name').fill('Ana');
  await page.getByLabel('Email').fill('ana@example.test');
  await page.getByLabel('Message').fill('A message long enough.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Too many messages were sent from here. Try again in an hour.',
  );
  await expect(page.getByLabel('Message')).toHaveValue('A message long enough.');
});
