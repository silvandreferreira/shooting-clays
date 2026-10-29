import {
  clubDisciplines,
  CLUBS,
  disciplineFields,
  findClub,
  homeClub,
  communityPeriodQuery,
  COMMUNITY_PERIODS,
  periodBounds,
  todayInLisbon,
  type DisciplineKey,
  type LeaderboardEntry,
} from '@shooting-clays/shared';
import { Link, useSearchParams } from 'react-router';
import { Avatar } from '../components/Avatar';
import { useT } from '../i18n';
import { formatMonth } from '../lib/format';
import { useLeaderboard } from '../lib/queries';

/** Olympic colours for the first three places; ties share the medal (two golds, then bronze). */
const MEDAL: Record<number, { fill: string; ring: string }> = {
  1: { fill: 'bg-gold', ring: 'ring-gold' },
  2: { fill: 'bg-silver', ring: 'ring-silver' },
  3: { fill: 'bg-bronze', ring: 'ring-bronze' },
};

function AvatarCircle({ entry, size }: { entry: LeaderboardEntry; size: string }) {
  const medal = MEDAL[entry.rank];
  return (
    <span className={`relative shrink-0 ${size}`}>
      <span
        className={`flex size-full items-center justify-center overflow-hidden rounded-full bg-accent text-lg font-bold text-accent-ink ${
          medal ? `ring-4 ${medal.ring}` : ''
        }`}
      >
        <Avatar name={entry.displayName} image={entry.avatarUrl} />
      </span>
      {medal && (
        <span
          aria-hidden
          data-testid="medal"
          className={`absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full border-2 border-card text-xs font-bold text-medal-ink ${medal.fill}`}
        >
          {entry.rank}
        </span>
      )}
    </span>
  );
}

function Score({ entry }: { entry: LeaderboardEntry }) {
  const t = useT();
  return (
    <span className="text-lg font-bold tabular-nums">
      <span aria-hidden>{entry.bestScore}</span>
      <span className="sr-only">{t.community.bestLabel(entry.bestScore)}</span>
    </span>
  );
}

const STEP_HEIGHT: Record<number, string> = { 1: 'h-24', 2: 'h-16', 3: 'h-11' };

/** The first three places as a stair: 2nd, 1st (tallest), 3rd. Empty steps stay empty. */
function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const t = useT();
  const slots = [entries[1], entries[0], entries[2]];
  return (
    <ol aria-label={t.community.podium} className="grid grid-cols-3 items-end gap-2 pt-2">
      {slots.map((entry, i) =>
        entry ? (
          <li
            key={i}
            aria-label={entry.displayName}
            aria-current={entry.isMe ? 'true' : undefined}
            data-testid={`podium-${i === 1 ? 1 : i === 0 ? 2 : 3}`}
            className="flex min-w-0 flex-col items-center gap-1 text-center"
          >
            <AvatarCircle entry={entry} size={i === 1 ? 'size-16' : 'size-12'} />
            <span
              className={`mt-1 w-full truncate text-sm font-semibold ${entry.isMe ? 'text-accent' : ''}`}
            >
              {entry.displayName}
            </span>
            <Score entry={entry} />
            <span
              className={`flex w-full items-start justify-center rounded-t-xl border border-black/10 pt-1 text-xl font-bold text-medal-ink ${
                STEP_HEIGHT[entry.rank] ?? 'h-11'
              } ${MEDAL[entry.rank]?.fill ?? 'bg-card'}`}
            >
              {t.community.place(entry.rank)}
            </span>
          </li>
        ) : (
          <li
            key={i}
            aria-hidden
            className="h-11 rounded-t-xl border-2 border-dashed border-line"
          />
        ),
      )}
    </ol>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  const t = useT();
  return (
    <li
      aria-label={entry.displayName}
      aria-current={entry.isMe ? 'true' : undefined}
      data-testid="ranking-row"
      className={`flex items-center gap-3 rounded-2xl border bg-card p-3 ${
        entry.isMe ? 'border-2 border-accent' : 'border-line'
      }`}
    >
      <span className="w-8 shrink-0 text-center text-lg font-bold tabular-nums">{entry.rank}</span>
      <AvatarCircle entry={entry} size="size-11" />
      <span className="min-w-0 flex-1 truncate font-semibold">
        {entry.displayName}
        {entry.isMe && <span className="ml-2 text-sm text-accent">{t.community.you}</span>}
      </span>
      <Score entry={entry} />
    </li>
  );
}

const selectClass = 'min-h-11 w-full rounded-lg border-2 border-line bg-card px-3 font-semibold';

/**
 * One club, discipline and period; the field is optional (decisions #71 and #73). The choices
 * live in the URL: `club`, `discipline`, `field` (absent: every field) and `period` (this month
 * by default, last month or this year).
 */
export function CommunityPage({ homeClubId }: { homeClubId: string | null }) {
  const t = useT();
  const [params, setParams] = useSearchParams();
  const today = todayInLisbon(new Date());
  const club = findClub(params.get('club'))?.id ?? homeClub(homeClubId).id;
  const disciplines = clubDisciplines(club);
  const discipline = disciplines.find((d) => d === params.get('discipline')) ?? disciplines[0]!;
  const fields = disciplineFields(club, discipline);
  const fieldId = fields.find((f) => f.id === params.get('field'))?.id;
  const choice = COMMUNITY_PERIODS.find((p) => p === params.get('period')) ?? COMMUNITY_PERIODS[0];
  const { period, date } = communityPeriodQuery(choice, today);
  const { from } = periodBounds(period, date);

  const { data, isPending, isError } = useLeaderboard({
    clubId: club,
    discipline,
    fieldId,
    period,
    date,
  });

  const update = (changes: Record<string, string | null>) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      return next;
    });
  const chooseClub = (id: string) =>
    update({
      club: id,
      discipline: clubDisciplines(id).includes(discipline) ? discipline : null,
      field: null,
    });
  // A field that does not have the new discipline goes back to every field.
  const chooseDiscipline = (d: DisciplineKey) =>
    update({
      discipline: d,
      field: disciplineFields(club, d).some((f) => f.id === fieldId) ? (fieldId ?? null) : null,
    });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.community.title}</h1>

      <div className="grid gap-2 sm:grid-cols-3">
        <select
          aria-label={t.community.clubLabel}
          value={club}
          onChange={(e) => chooseClub(e.target.value)}
          className={selectClass}
        >
          {CLUBS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          aria-label={t.community.disciplineLabel}
          value={discipline}
          onChange={(e) => chooseDiscipline(e.target.value as DisciplineKey)}
          className={selectClass}
        >
          {disciplines.map((k) => (
            <option key={k} value={k}>
              {t.disciplines[k]}
            </option>
          ))}
        </select>
        <select
          aria-label={t.community.fieldLabel}
          value={fieldId ?? ''}
          onChange={(e) => update({ field: e.target.value || null })}
          className={selectClass}
        >
          <option value="">{t.community.allFields}</option>
          {fields.map((f) => (
            <option key={f.id} value={f.id}>
              {t.clubs.field(f.id)}
            </option>
          ))}
        </select>
      </div>

      <div
        role="group"
        aria-label={t.community.periodLabel}
        className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1"
      >
        {COMMUNITY_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={choice === p}
            onClick={() => update({ period: p === COMMUNITY_PERIODS[0] ? null : p })}
            className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${
              choice === p ? 'bg-accent text-accent-ink' : 'text-ink-muted'
            }`}
          >
            {t.community.periods[p]}
          </button>
        ))}
      </div>
      <p className="text-center font-semibold" data-testid="period-label" aria-live="polite">
        {period === 'year' ? from.slice(0, 4) : formatMonth(from)}
      </p>

      {data?.meHidden && (
        <p role="status" className="rounded-xl border border-line bg-card p-3 text-sm">
          {t.community.hidden}{' '}
          <Link to="/settings" className="font-semibold underline">
            {t.community.hiddenLink}
          </Link>
        </p>
      )}

      {isPending ? (
        <p className="py-8 text-center text-ink-muted">{t.community.loading}</p>
      ) : isError && !data ? (
        <p role="alert" className="py-8 text-center">
          {t.community.loadError}
        </p>
      ) : data.entries.length === 0 ? (
        <p className="py-8 text-center text-ink-muted">{t.community.empty}</p>
      ) : (
        <>
          <Podium entries={data.entries} />
          {data.entries.length > 3 && (
            <ol aria-label={t.community.ranking} className="space-y-2">
              {data.entries.slice(3).map((entry, i) => (
                <Row key={i} entry={entry} />
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
