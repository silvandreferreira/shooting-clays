import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { t } from './i18n/en';
import { queryKeys, useMe } from './lib/queries';
import type { CurrentUser } from './lib/session';
import { useSignOut } from './lib/sign-out';
import { AddSessionPage } from './pages/AddSessionPage';
import { AdminPage } from './pages/AdminPage';
import { DashboardPage, SampleDashboardPage } from './pages/DashboardPage';
import { EditSessionPage } from './pages/EditSessionPage';
import { HistoryPage } from './pages/HistoryPage';
import { InactivePage } from './pages/InactivePage';

export function App({ user }: { user: CurrentUser }) {
  const { data: me, isError, refetch } = useMe();
  const queryClient = useQueryClient();
  const signOut = useSignOut();
  const status = me?.status;

  useEffect(() => {
    // A disabled account keeps nothing personal on the device: drop every cached query but the
    // account itself.
    if (status === 'disabled') {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.me[0] });
    }
  }, [status, queryClient]);

  if (!me) {
    if (!isError) return <p className="py-16 text-center text-ink-muted">{t.auth.loading}</p>;
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 text-center">
        <p role="alert">{t.account.loadError}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="min-h-11 rounded-lg bg-accent px-6 font-semibold text-accent-ink"
        >
          {t.dashboard.retry}
        </button>
        <button type="button" onClick={() => void signOut()} className="min-h-11 font-semibold">
          {t.auth.signOut}
        </button>
      </main>
    );
  }
  if (me.status === 'disabled') return <InactivePage email={me.email} />;

  return (
    <Routes>
      <Route element={<Layout user={user} me={me} />}>
        {me.status === 'pending' ? (
          <>
            <Route index element={<SampleDashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        ) : (
          <>
            <Route index element={<DashboardPage />} />
            <Route path="add" element={<AddSessionPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="history/:id" element={<EditSessionPage />} />
            {me.role === 'admin' && <Route path="admin" element={<AdminPage />} />}
            <Route path="*" element={<p className="py-8 text-center">{t.notFound}</p>} />
          </>
        )}
      </Route>
    </Routes>
  );
}
