import { CLUBS, homeClub, type Me } from '@shooting-clays/shared';
import { useT } from '../i18n';
import { useUpdateProfile } from '../lib/queries';

/** `/app/clubs`: the clubs, their fields and disciplines; the home club is chosen here. */
export function ClubsPage({ me }: { me: Me }) {
  const t = useT();
  const update = useUpdateProfile();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.clubs.title}</h1>
      <p className="text-ink-muted">{t.clubs.intro}</p>
      {update.isError && (
        <p role="alert" className="rounded-xl border border-danger p-3 font-medium text-danger">
          {t.clubs.saveError}
        </p>
      )}
      <ul className="space-y-3">
        {CLUBS.map((club) => {
          const isHome = homeClub(me.homeClubId).id === club.id;
          return (
            <li key={club.id}>
              <article
                aria-labelledby={`club-${club.id}`}
                className={`space-y-3 rounded-2xl border bg-card p-4 ${
                  isHome ? 'border-2 border-accent' : 'border-line'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id={`club-${club.id}`} className="text-xl font-bold">
                    {club.name}
                  </h2>
                  {isHome ? (
                    <span className="rounded-full bg-accent px-3 text-sm leading-7 font-bold text-accent-ink">
                      {t.clubs.home}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => update.mutate({ homeClubId: club.id })}
                      disabled={update.isPending}
                      className="min-h-11 rounded-lg border-2 border-line px-4 font-semibold disabled:opacity-50"
                    >
                      {t.clubs.makeHome}
                    </button>
                  )}
                </div>
                <dl className="divide-y divide-line">
                  {club.fields.map((field) => (
                    <div key={field.id} className="flex flex-wrap gap-x-3 py-2">
                      <dt className="w-20 font-semibold">{t.clubs.field(field.id)}</dt>
                      <dd className="text-ink-muted">
                        {field.disciplines.map((d) => t.disciplines[d]).join(', ')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
