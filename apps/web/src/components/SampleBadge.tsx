import { useT } from '../i18n';

/** Marks a card or chart that shows sample data (pending accounts). */
export function SampleBadge() {
  const t = useT();
  return (
    <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-xs font-semibold text-ink-muted">
      {t.account.sampleData}
    </span>
  );
}
