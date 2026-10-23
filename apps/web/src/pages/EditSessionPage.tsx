import { useLocation, useNavigate, useParams } from 'react-router';
import { SessionForm } from '../components/SessionForm';
import { t } from '../i18n/en';
import { useSessions, useUpdateSession } from '../lib/queries';

export function EditSessionPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const back = (useLocation().state as { back?: string } | null)?.back ?? '/history';
  const { data: sessions, isPending } = useSessions({});
  const updateSession = useUpdateSession(id);
  const session = sessions?.find((s) => s.id === id);

  if (isPending) return <p className="py-8 text-center text-ink-muted">{t.history.loading}</p>;
  if (!session) return <p className="py-8 text-center">{t.history.notFound}</p>;

  return (
    <SessionForm
      title={t.form.editTitle}
      defaultValues={{
        date: session.date,
        discipline: session.discipline,
        score: session.score,
        hardestTargets: session.hardestTargets,
        notes: session.notes ?? '',
      }}
      onSubmit={async (data) => {
        await updateSession.mutateAsync(data);
        await navigate(back);
      }}
      onCancel={() => void navigate(back)}
    />
  );
}
