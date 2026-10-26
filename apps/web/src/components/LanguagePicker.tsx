import { LOCALES, type Locale } from '@shooting-clays/shared';
import { useLocale, useT } from '../i18n';

/** English · Português, each written in its own language. Switching applies at once. */
export function LanguagePicker({ onChange }: { onChange?: (locale: Locale) => void }) {
  const t = useT();
  const { locale, setLocale } = useLocale();
  return (
    <div
      role="group"
      aria-label={t.settings.language}
      className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-card p-1"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={locale === l}
          onClick={() => {
            if (l === locale) return;
            setLocale(l);
            onChange?.(l);
          }}
          className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${
            locale === l ? 'bg-accent text-accent-ink' : 'text-ink-muted'
          }`}
        >
          {t.languages[l]}
        </button>
      ))}
    </div>
  );
}
