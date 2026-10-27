import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useT } from '../i18n';
import { clearDeviceCache } from '../lib/query-client';

/** Admins only (Settings): clears what the app keeps on this device and reloads. */
export function ClearCache() {
  const t = useT();
  const queryClient = useQueryClient();
  const [clearing, setClearing] = useState(false);
  return (
    <section className="space-y-2 rounded-2xl border border-line bg-card p-4">
      <h2 className="font-semibold">{t.settings.deviceTitle}</h2>
      <p className="text-sm text-ink-muted">{t.settings.clearCacheHelp}</p>
      <button
        type="button"
        disabled={clearing}
        onClick={() => {
          setClearing(true);
          void clearDeviceCache(queryClient);
        }}
        className="min-h-11 rounded-lg border-2 border-line px-4 font-semibold disabled:opacity-60"
      >
        {clearing ? t.settings.clearingCache : t.settings.clearCache}
      </button>
    </section>
  );
}
