import {
  DISCIPLINE_KEYS,
  findClub,
  monthBounds,
  shiftMonth,
  todayInLisbon,
  type Period,
  type Session,
  type SessionsQuery,
} from '@shooting-clays/shared';
import { Link, useLocation, useSearchParams } from 'react-router';
import { useT } from '../i18n';
import { disciplineColor } from '../lib/colors';
import { formatDate, formatList } from '../lib/format';
import { useDeleteSession, useSessions } from '../lib/queries';

/** "CCM · Field 2". */
export function usePlaceLabel() {
  const t = useT();
  return (session: Pick<Session, 'clubId' | 'fieldId'>) => {
    const club = findClub(session.clubId);
    return club ? `${club.name} · ${t.clubs.field(session.fieldId)}` : null;
  };
}

function SessionItem({ session }: { session: Session }) {
  const t = useT();
  const place = usePlaceLabel()(session);
  const location = useLocation();
  const deleteSession = useDeleteSession();
  const onDelete = () => {
    if (window.confirm(t.history.confirmDelete)) deleteSession.mutate(session.id);
  };
  return (
    <li
      data-testid="session-item"
      className="rounded-2xl border border-line bg-card p-4 shadow-sm"
      aria-label={[
        formatDate(session.date),
        place,
        t.disciplines[session.discipline],
        session.score,
      ]
        .filter((part) => part !== null)
        .join(', ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-muted">{formatDate(session.date)}</p>
          <p className="flex items-center gap-2 font-semibold">
            <span
              aria-hidden
              className="size-2.5 rounded-full"
              style={{ background: disciplineColor(session.discipline) }}
            />
            {t.disciplines[session.discipline]}
          </p>
          {place && (
            <p className="text-sm text-ink-muted" data-testid="place">
              {place}
            </p>
          )}
        </div>
        <p className="text-3xl font-bold tabular-nums">
          {session.score}
          <span className="text-base font-medium text-ink-muted">/25</span>
        </p>
      </div>
      {session.hardestTargets.length > 0 && (
        <p className="mt-2 text-sm" data-testid="hardest-targets">
          <span className="text-ink-muted">{t.form.hardestTargets}: </span>
          {formatList(session.hardestTargets)}
        </p>
      )}
      {session.notes && <p className="mt-2 text-sm whitespace-pre-line">{session.notes}</p>}
      {deleteSession.isError && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {t.history.deleteError}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Link
          to={`/history/${session.id}`}
          state={{ back: `${location.pathname}${location.search}` }}
          className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-line font-semibold"
        >
          {t.history.edit}
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleteSession.isPending}
          className="min-h-11 flex-1 rounded-lg border border-danger font-semibold text-danger disabled:opacity-60"
        >
          {t.history.delete}
        </button>
      </div>
    </li>
  );
}

/** This month first, as on the other pages (decision #74). */
const HISTORY_PERIODS = ['thisMonth', 'lastMonth', 'allTime'] as const satisfies readonly Period[];

function periodRange(period: Period, today: string): Pick<SessionsQuery, 'from' | 'to'> {
  if (period === 'allTime') return {};
  return monthBounds(period === 'lastMonth' ? shiftMonth(today, -1) : today);
}

export function HistoryPage() {
  const t = useT();
  // The filters live in the URL so they survive editing a session and coming back.
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get('discipline');
  const discipline = DISCIPLINE_KEYS.find((k) => k === param) ?? '';
  const period = HISTORY_PERIODS.find((p) => p === searchParams.get('period')) ?? 'thisMonth';
  const { data, isPending, isError } = useSessions({
    ...(discipline && { discipline }),
    ...periodRange(period, todayInLisbon(new Date())),
  });
  const update = (key: 'discipline' | 'period', value: string | null) =>
    setSearchParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.history.title}</h1>
      <div>
        <label htmlFor="discipline-filter" className="mb-2 block text-sm font-semibold">
          {t.history.filterLabel}
        </label>
        <select
          id="discipline-filter"
          value={discipline}
          onChange={(e) => update('discipline', e.target.value || null)}
          className="min-h-12 w-full rounded-xl border border-line bg-card px-3 text-base"
        >
          <option value="">{t.history.allDisciplines}</option>
          {DISCIPLINE_KEYS.map((k) => (
            <option key={k} value={k}>
              {t.disciplines[k]}
            </option>
          ))}
        </select>
      </div>
      <div
        role="group"
        aria-label={t.dashboard.periodLabel}
        className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1"
      >
        {HISTORY_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={period === p}
            onClick={() => update('period', p === 'thisMonth' ? null : p)}
            className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${
              period === p ? 'bg-accent text-accent-ink' : 'text-ink-muted'
            }`}
          >
            {t.periods[p]}
          </button>
        ))}
      </div>
      {isPending ? (
        <p className="py-8 text-center text-ink-muted">{t.history.loading}</p>
      ) : isError ? (
        <p role="alert" className="py-8 text-center">
          {t.history.loadError}
        </p>
      ) : data.length === 0 ? (
        <p className="py-8 text-center text-ink-muted">{t.history.empty}</p>
      ) : (
        <ul className="space-y-3">
          {data.map((s) => (
            <SessionItem key={s.id} session={s} />
          ))}
        </ul>
      )}
    </div>
  );
}
