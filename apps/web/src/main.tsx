import * as Sentry from '@sentry/react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, useLocation } from 'react-router';
import { App } from './App';
import { I18nProvider, strings, useT } from './i18n';
import { completeSignInRedirect } from './lib/auth';
import { createQueryClient, persistOptionsFor } from './lib/query-client';
import { useAuthState } from './lib/session';
import { FaqPage } from './pages/FaqPage';
import { SignInPage } from './pages/SignInPage';
import './index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE });
}

const queryClient = createQueryClient();

function Root() {
  const t = useT();
  const auth = useAuthState();
  const { pathname } = useLocation();
  if (auth.status === 'loading') {
    return <p className="py-16 text-center text-ink-muted">{t.auth.loading}</p>;
  }
  if (auth.status === 'signedOut') {
    // The FAQ is public: it also answers questions asked before signing in.
    if (pathname === '/faq') {
      return (
        <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
          <Link to="/" className="inline-flex min-h-11 items-center font-semibold text-accent">
            ‹ {t.faq.backToSignIn}
          </Link>
          <FaqPage />
        </main>
      );
    }
    return <SignInPage />;
  }
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
    <Sentry.ErrorBoundary fallback={<p className="p-8 text-center">{strings().errorBoundary}</p>}>
      <I18nProvider>
        <BrowserRouter>
          <Root />
        </BrowserRouter>
      </I18nProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
