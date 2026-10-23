import * as Sentry from '@sentry/react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { t } from './i18n/en';
import { completeSignInRedirect } from './lib/auth';
import { createQueryClient, persistOptionsFor } from './lib/query-client';
import { useAuthState } from './lib/session';
import { SignInPage } from './pages/SignInPage';
import './index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE });
}

const queryClient = createQueryClient();

function Root() {
  const auth = useAuthState();
  if (auth.status === 'loading') {
    return <p className="py-16 text-center text-ink-muted">{t.auth.loading}</p>;
  }
  if (auth.status === 'signedOut') return <SignInPage />;
  return (
    // Keyed by user: switching accounts never shows the previous user's cached data.
    <PersistQueryClientProvider
      key={auth.user.id}
      client={queryClient}
      persistOptions={persistOptionsFor(auth.user.id)}
    >
      <App user={auth.user} />
    </PersistQueryClientProvider>
  );
}

await completeSignInRedirect();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p className="p-8 text-center">{t.errorBoundary}</p>}>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
