import { homeClub, todayInLisbon, type Me } from '@shooting-clays/shared';
import { useNavigate } from 'react-router';
import { SessionForm } from '../components/SessionForm';
import { useT } from '../i18n';
import { useCreateSession } from '../lib/queries';

export function AddSessionPage({ me }: { me: Me }) {
  const t = useT();
  const navigate = useNavigate();
  const createSession = useCreateSession();
  return (
    <SessionForm
      title={t.form.addTitle}
      defaultValues={{
        date: todayInLisbon(new Date()),
        clubId: homeClub(me.homeClubId).id,
        discipline: 'compak',
        fieldId: '',
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
