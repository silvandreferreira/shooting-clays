import {
  COMMUNITY_PERIODS,
  DISCIPLINE_KEYS,
  disciplineSchema,
  isoDateSchema,
  periodBounds,
  shiftPeriod,
  todayInLisbon,
  type CommunityPeriod,
  type LeaderboardEntry,
} from '@shooting-clays/shared';
import { Link, useSearchParams } from 'react-router';
import { Avatar } from '../components/Avatar';
import { t } from '../i18n/en';
import { formatPeriod } from '../lib/format';
import { useLeaderboard } from '../lib/queries';

const isPeriod = (value: string | null): value is CommunityPeriod =>
  COMMUNITY_PERIODS.includes(value as CommunityPeriod);

function AvatarCircle({ entry, size }: { entry: LeaderboardEntry; size: string }) {
  return (
    <span
      className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-lg font-bold text-accent-ink`}
    >
      <Avatar name={entry.displayName} image={entry.avatarUrl} />
    </span>
  );
}

function Best({ entry }: { entry: LeaderboardEntry }) {
  return (
    <>
      <span aria-hidden>{t.community.best(entry.bestScore, entry.bestScoreCount)}</span>
      <span className="sr-only">
        {t.community.bestLabel(entry.bestScore, entry.bestScoreCount)}
      </span>
    </>
  );
}

const STEP_HEIGHT: Record<number, string> = { 1: 'h-24', 2: 'h-16', 3: 'h-11' };

/** The first three places as a stair: 2nd, 1st (tallest), 3rd. Empty steps stay empty. */
function Podium({ entries }: { entries: LeaderboardEntry[] }) {
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
            <AvatarCircle entry={entry} size={i === 1 ? 'size-14' : 'size-11'} />
            <span
              className={`w-full truncate text-sm font-semibold ${entry.isMe ? 'text-accent' : ''}`}
            >
              {entry.displayName}
            </span>
            <span className="text-lg font-bold tabular-nums">
              <Best entry={entry} />
            </span>
            <span
              className={`flex w-full items-start justify-center rounded-t-xl border-2 pt-1 text-xl font-bold ${
                STEP_HEIGHT[entry.rank] ?? 'h-11'
              } ${i === 1 ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-card'}`}
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
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {entry.displayName}
          {entry.isMe && <span className="ml-2 text-sm text-accent">{t.community.you}</span>}
        </span>
        <span className="block text-sm text-ink-muted">{t.community.series(entry.series)}</span>
      </span>
      <span className="text-lg font-bold tabular-nums">
        <Best entry={entry} />
      </span>
    </li>
  );
}

export function CommunityPage() {
  const [params, setParams] = useSearchParams();
  const today = todayInLisbon(new Date());
  const discipline =
    disciplineSchema.safeParse(params.get('discipline')).data ?? DISCIPLINE_KEYS[0];
  const period = isPeriod(params.get('period'))
    ? (params.get('period') as CommunityPeriod)
    : 'month';
  const requested = isoDateSchema.safeParse(params.get('date')).data;
  const date = requested && requested <= today ? requested : today;
  const { from, to } = periodBounds(period, date);
  const isCurrent = to >= today;

  const { data, isPending, isError } = useLeaderboard({ discipline, period, date });

  const update = (changes: Record<string, string>) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      for (const [key, value] of Object.entries(changes)) next.set(key, value);
      return next;
    });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.community.title}</h1>

      <label className="block">
        <span className="sr-only">{t.community.disciplineLabel}</span>
        <select
          aria-label={t.community.disciplineLabel}
          value={discipline}
          onChange={(e) => update({ discipline: e.target.value })}
          className="min-h-11 w-full rounded-lg border-2 border-line bg-card px-3 font-semibold"
        >
          {DISCIPLINE_KEYS.map((k) => (
            <option key={k} value={k}>
              {t.disciplines[k]}
            </option>
          ))}
        </select>
      </label>

      <div
        role="group"
        aria-label={t.community.periodLabel}
        className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1"
      >
        {COMMUNITY_PERIODS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={period === p}
            onClick={() => update({ period: p, date: today })}
            className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${
              period === p ? 'bg-accent text-accent-ink' : 'text-ink-muted'
            }`}
          >
            {t.community.periods[p]}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={t.community.previous}
          onClick={() => update({ date: shiftPeriod(period, date, -1) })}
          className="flex size-11 items-center justify-center rounded-lg border-2 border-line text-xl font-bold"
        >
          ‹
        </button>
        <p className="text-center font-semibold" data-testid="period-label" aria-live="polite">
          {formatPeriod(period, from, to)}
        </p>
        <button
          type="button"
          aria-label={t.community.next}
          disabled={isCurrent}
          onClick={() => update({ date: shiftPeriod(period, date, 1) })}
          className="flex size-11 items-center justify-center rounded-lg border-2 border-line text-xl font-bold disabled:opacity-30"
        >
          ›
        </button>
      </div>

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
          <p className="text-center text-sm text-ink-muted">{t.community.rules}</p>
        </>
      )}
    </div>
  );
}
