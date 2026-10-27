import { useLocation } from 'react-router';
import { FaqList } from '../components/FaqList';
import { useT } from '../i18n';

/** `/app/faq#ranking` opens and scrolls to that question. */
export function FaqPage() {
  const t = useT();
  const { hash } = useLocation();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.faq.title}</h1>
      <FaqList target={hash.slice(1)} />
    </div>
  );
}
