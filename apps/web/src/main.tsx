import * as Sentry from '@sentry/react';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { I18nProvider, strings, useT } from './i18n';
import { completeSignInRedirect } from './lib/auth';
import { createQueryClient, persistOptionsFor } from './lib/query-client';
import { useAuthState } from './lib/session';
import { SignInPage } from './pages/SignInPage';
import { APP_PATH } from './site/routes';
import './index.css';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, environment: import.meta.env.MODE });
}

// Only the app registers the service worker (built by vite-plugin-pwa); the public pages do not
// need it (vite.config.ts).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js', { scope: '/' });
}

const queryClient = createQueryClient();

function Root() {
  const t = useT();
  const auth = useAuthState();
  if (auth.status === 'loading') {
    return <p className="py-16 text-center text-ink-muted">{t.auth.loading}</p>;
  }
  if (auth.status === 'signedOut') {
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
        <BrowserRouter basename={APP_PATH}>
          <Root />
        </BrowserRouter>
      </I18nProvider>
    </Sentry.ErrorBoundary>
  </StrictMode>,
);
