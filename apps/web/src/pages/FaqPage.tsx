import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { useT, type Strings } from '../i18n';

type FaqId = keyof Strings['faq']['items'];

/** Questions as collapsible sections; `/faq#ranking` opens and scrolls to that one. */
export function FaqPage() {
  const t = useT();
  const { hash } = useLocation();
  const target = hash.slice(1);

  useEffect(() => {
    if (target) document.getElementById(target)?.scrollIntoView();
  }, [target]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.faq.title}</h1>
      <div className="space-y-2">
        {(Object.keys(t.faq.items) as FaqId[]).map((id) => (
          <details
            key={id}
            id={id}
            open={id === target}
            className="rounded-2xl border border-line bg-card"
          >
            <summary className="flex min-h-12 cursor-pointer items-center px-4 py-3 font-semibold">
              {t.faq.items[id].question}
            </summary>
            <p className="px-4 pb-4 text-ink-muted">{t.faq.items[id].answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
