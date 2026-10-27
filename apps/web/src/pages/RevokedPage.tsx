import { useLocale, useT } from '../i18n';
import { useNotifications, useReadNotification } from '../lib/queries';
import { useSignOut } from '../lib/sign-out';
import { SITE_PATHS } from '../site/routes';

/**
 * Revoked account (decision #65): the data is already gone and the admin's message is all that
 * is left. "Read" deletes the account, signs out and opens the public home page.
 */
export function RevokedPage() {
  const t = useT();
  const { locale } = useLocale();
  const signOut = useSignOut();
  const { data, isError } = useNotifications();
  const read = useReadNotification();
  const notice = data?.items.find((n) => n.kind === 'revoked');
  const removed = read.data !== undefined && 'accountRemoved' in read.data;

  const onRead = () => {
    if (!notice) return;
    read.mutate(notice.id, {
      onSuccess: async (result) => {
        if (!('accountRemoved' in result)) return;
        // The Neon Auth user is already deleted, so ending the session may fail: carry on.
        await signOut().catch(() => undefined);
        window.location.assign(SITE_PATHS[locale].home);
      },
    });
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-bold">{t.notifications.revoked.title}</h1>
      {notice?.kind === 'revoked' && (
        <p className="whitespace-pre-line" data-testid="revoked-message">
          {notice.params.message}
        </p>
      )}
      {isError && !data && <p role="alert">{t.notifications.loadError}</p>}
      {(read.isError || (read.isSuccess && !removed)) && (
        <p role="alert" className="font-medium text-danger">
          {t.notifications.readError}
        </p>
      )}
      <p className="text-sm text-ink-muted">{t.revoked.note}</p>
      <button
        type="button"
        onClick={onRead}
        disabled={!notice || read.isPending || removed}
        className="min-h-14 rounded-xl bg-accent text-lg font-bold text-accent-ink disabled:opacity-60"
      >
        {read.isPending || removed ? t.revoked.removing : t.notifications.markRead}
      </button>
    </main>
  );
}
