import { todayInLisbon } from '@shooting-clays/shared';
import { useNavigate } from 'react-router';
import { SessionForm } from '../components/SessionForm';
import { useT } from '../i18n';
import { useCreateSession } from '../lib/queries';

export function AddSessionPage() {
  const t = useT();
  const navigate = useNavigate();
  const createSession = useCreateSession();
  return (
    <SessionForm
      title={t.form.addTitle}
      defaultValues={{
        date: todayInLisbon(new Date()),
        discipline: 'compak',
        score: 15,
        hardestTargets: [],
        notes: '',
      }}
      onSubmit={async (data) => {
        await createSession.mutateAsync(data);
        await navigate('/');
      }}
    />
  );
}
