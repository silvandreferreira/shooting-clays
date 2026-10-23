import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { t } from './i18n/en';
import { AddSessionPage } from './pages/AddSessionPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditSessionPage } from './pages/EditSessionPage';
import { HistoryPage } from './pages/HistoryPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="add" element={<AddSessionPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="history/:id" element={<EditSessionPage />} />
        <Route path="*" element={<p className="py-8 text-center">{t.notFound}</p>} />
      </Route>
    </Routes>
  );
}
