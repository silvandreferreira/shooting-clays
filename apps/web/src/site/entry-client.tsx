import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { VercelMetrics } from '../components/VercelMetrics';
import { I18nProvider } from '../i18n';
import { findSiteRoute } from './routes';
import { Site } from './Site';
import '../index.css';

const route = findSiteRoute(window.location.pathname) ?? null;
const root = document.getElementById('root')!;
const site = (
  <StrictMode>
    <I18nProvider locale={route?.locale ?? 'pt-PT'}>
      <Site route={route} />
    </I18nProvider>
    <VercelMetrics />
  </StrictMode>
);

// Built pages arrive prerendered (scripts/prerender.mjs); the dev server sends the empty template.
if (root.hasChildNodes()) hydrateRoot(root, site);
else createRoot(root).render(site);
