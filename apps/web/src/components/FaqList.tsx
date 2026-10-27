import { useEffect } from 'react';
import { useT, type Strings } from '../i18n';

export type FaqId = keyof Strings['faq']['items'];

/**
 * Questions as collapsible sections; the one whose id is `target` starts open and scrolls into
 * view. Shared by the app (`/app/faq`) and the public FAQ (src/site), which has no router.
 */
export function FaqList({ target, ids }: { target?: string; ids?: FaqId[] }) {
  const t = useT();

  useEffect(() => {
    if (target) document.getElementById(target)?.scrollIntoView();
  }, [target]);

  return (
    <div className="space-y-2">
      {(ids ?? (Object.keys(t.faq.items) as FaqId[])).map((id) => (
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
  );
}
