import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

/**
 * Vercel Web Analytics and Speed Insights (cookieless, no consent banner needed). Only in builds on
 * Vercel (vite.config.ts): local runs, tests and `vite preview` load nothing. Query strings are
 * dropped before sending, so admin searches and filters never leave the browser.
 */
export const withoutQuery = <T extends { url: string }>(event: T): T => ({
  ...event,
  url: event.url.split(/[?#]/)[0]!,
});

export function VercelMetrics() {
  if (!import.meta.env.VITE_VERCEL_METRICS) return null;
  return (
    <>
      <Analytics beforeSend={withoutQuery} />
      <SpeedInsights beforeSend={withoutQuery} />
    </>
  );
}
