import { t } from '../i18n/en';
import { useSignOut } from '../lib/sign-out';

export function AccessNotOpenPage({ email }: { email: string }) {
  const signOut = useSignOut();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-bold">{t.auth.accessNotOpenTitle}</h1>
      <p className="text-ink-muted">{t.auth.accessNotOpenMessage}</p>
      <p className="text-sm text-ink-muted">{email}</p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="min-h-14 rounded-xl border-2 border-line bg-card text-lg font-semibold"
      >
        {t.auth.signOut}
      </button>
    </main>
  );
}
