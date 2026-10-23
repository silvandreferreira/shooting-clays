import { todayInLisbon } from '@shooting-clays/shared';
import { useNavigate } from 'react-router';
import { SessionForm } from '../components/SessionForm';
import { t } from '../i18n/en';
import { useCreateSession } from '../lib/queries';

export function AddSessionPage() {
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
