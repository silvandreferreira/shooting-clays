import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { t } from './i18n/en';
import { ApiError } from './lib/api';
import { useProfile } from './lib/queries';
import type { CurrentUser } from './lib/session';
import { AccessNotOpenPage } from './pages/AccessNotOpenPage';
import { AddSessionPage } from './pages/AddSessionPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditSessionPage } from './pages/EditSessionPage';
import { HistoryPage } from './pages/HistoryPage';

export function App({ user }: { user: CurrentUser }) {
  const { error } = useProfile();
  if (error instanceof ApiError && error.code === 'ACCESS_NOT_OPEN') {
    return <AccessNotOpenPage email={user.email} />;
  }
  return (
    <Routes>
      <Route element={<Layout user={user} />}>
        <Route index element={<DashboardPage />} />
        <Route path="add" element={<AddSessionPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:id" element={<EditSessionPage />} />
        <Route path="*" element={<p className="py-8 text-center">{t.notFound}</p>} />
      </Route>
    </Routes>
  );
}
