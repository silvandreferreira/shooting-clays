import { API_URL, expect, OWNER, test, type E2EUser } from './fixtures';

/** Signs in with Google for the first time: no profile yet. */
const NEWBIE: E2EUser = { id: 'e2e-newbie', email: 'newbie@example.test', name: 'Nina Newbie' };

const bell = (page: import('@playwright/test').Page) =>
  page.getByRole('link', { name: /^Notifications/ });

test('R48: a sign-up notifies the user and the admin; approving it tells the user the account is active', async ({
  page,
  auth,
}) => {
  // The new user: their sign-up was received.
  auth.user = NEWBIE;
  await page.goto('/app');
  await expect(page.getByTestId('pending-banner')).toBeVisible();
  await expect(bell(page)).toHaveAccessibleName('Notifications, 1 unread');
  await bell(page).click();
  await expect(page).toHaveURL('/app/notifications');
  const note = page.getByTestId('notification');
  await expect(note).toHaveCount(1);
  await expect(note).toContainText('Sign-up received');
  await expect(note).toContainText('Unread');
  await note.getByRole('button', { name: 'Mark as read' }).click();
  await expect(note.getByRole('button', { name: 'Mark as read' })).toHaveCount(0);
  await expect(note).not.toContainText('Unread');
  await expect(bell(page)).toHaveAccessibleName('Notifications');

  // The admin: a new account waits, with a link to the pending users.
  auth.user = OWNER;
  await page.goto('/app');
  await expect(bell(page)).toHaveAccessibleName('Notifications, 1 unread');
  await bell(page).click();
  await expect(note).toContainText(`${NEWBIE.name} signed up`);
  await note.getByRole('link', { name: 'See pending users' }).click();
  await expect(page).toHaveURL('/app/admin?status=pending');
  const row = page.getByRole('listitem', { name: NEWBIE.name });
  await row.getByRole('switch').click();
  await expect(page.getByText(`${NEWBIE.name} can now use the app.`)).toBeVisible();

  auth.user = NEWBIE;
  await page.goto('/app/notifications');
  await expect(bell(page)).toHaveAccessibleName('Notifications, 1 unread');
  await expect(note.first()).toContainText('Your account is active');
});

test('R48: a contact form message appears in the admin notifications, in Portuguese too', async ({
  page,
  request,
}) => {
  const res = await request.post(`${API_URL}/api/contact`, {
    data: {
      name: 'Ana Silva',
      email: 'ana@example.test',
      message: 'Podem acrescentar o Fosso Olímpico?',
      locale: 'pt-PT',
    },
  });
  expect(res.ok()).toBe(true);

  await page.goto('/app/notifications');
  const note = page.getByTestId('notification');
  await expect(note).toContainText('Message from Ana Silva');
  await expect(note).toContainText('ana@example.test');
  await expect(note).toContainText('Podem acrescentar o Fosso Olímpico?');
  await expect(note.getByRole('link', { name: 'Reply by email' })).toHaveAttribute(
    'href',
    'mailto:ana@example.test',
  );

  await page.evaluate(() => localStorage.setItem('shooting-clays:locale', 'pt-PT'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Notificações', level: 1 })).toBeVisible();
  await expect(note).toContainText('Mensagem de Ana Silva');
  await expect(note.getByRole('button', { name: 'Li' })).toBeVisible();
});
