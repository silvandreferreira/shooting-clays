import {
  CLUBS,
  DISCIPLINE_KEYS,
  filterDashboard,
  findClub,
  homeClub,
  DASHBOARD_PERIODS,
  periodsForDate,
  type Dashboard,
  type DisciplineKey,
  type Period,
  type PeriodStats,
  type SeriesPoint,
} from '@shooting-clays/shared';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AveragesChart, ScoresChart, type AverageBar } from '../components/Charts';
import { DisciplineCard } from '../components/DisciplineCard';
import { Switch } from '../components/Switch';
import { useT } from '../i18n';
import { useDashboard } from '../lib/queries';
import { sampleDashboard } from '../lib/sample-dashboard';

function PeriodSwitcher({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const t = useT();
  return (
    <div
      role="group"
      aria-label={t.dashboard.periodLabel}
      className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1"
    >
      {DASHBOARD_PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={value === p}
          onClick={() => onChange(p)}
          className={`min-h-11 rounded-lg px-2 text-sm font-semibold ${
            value === p ? 'bg-accent text-accent-ink' : 'text-ink-muted'
          }`}
        >
          {t.periods[p]}
        </button>
      ))}
    </div>
  );
}

export function DashboardPage({ homeClubId }: { homeClubId: string | null }) {
  const t = useT();
  const { data, isPending, isError, refetch } = useDashboard();

  if (isPending) return <p className="py-8 text-center text-ink-muted">{t.dashboard.loading}</p>;
  if (isError && !data) {
    return (
      <div className="py-8 text-center">
        <p role="alert">{t.dashboard.loadError}</p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-4 min-h-11 rounded-lg bg-accent px-6 font-semibold text-accent-ink"
        >
          {t.dashboard.retry}
        </button>
      </div>
    );
  }

  return <DashboardView data={data} homeClubId={homeClubId} />;
}

/** Pending account: the same dashboard with sample data from the front end (no API call). */
export function SampleDashboardPage() {
  const data = useMemo(() => sampleDashboard(), []);
  return <DashboardView data={data} homeClubId={null} sample />;
}

const ALL_CLUBS = 'all';
const CLUB_STORAGE_KEY = 'dashboard.club';
const BY_FIELD_STORAGE_KEY = 'dashboard.byField';

/** The club and "Consider fields" are kept on this device (decision #70). */
function stored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or storage blocked: the choice lasts until the page closes.
  }
}

function initialClub(homeClubId: string | null) {
  const value = stored(CLUB_STORAGE_KEY);
  if (value === ALL_CLUBS || findClub(value)) return value!;
  return homeClub(homeClubId).id;
}

interface CardData {
  discipline: DisciplineKey;
  /** Only with fields considered. */
  fieldId?: string;
  stats: PeriodStats;
  points: SeriesPoint[];
}

function DashboardView({
  data,
  homeClubId,
  sample = false,
}: {
  data: Dashboard;
  homeClubId: string | null;
  sample?: boolean;
}) {
  const t = useT();
  // This month first (decision #77), as in the Community and History.
  const [period, setPeriod] = useState<Period>('thisMonth');
  const [club, setClub] = useState(() => initialClub(homeClubId));
  const [byField, setByField] = useState(() => stored(BY_FIELD_STORAGE_KEY) === '1');

  const clubData = useMemo(
    () => (club === ALL_CLUBS ? data : filterDashboard(data, (p) => p.clubId === club)),
    [data, club],
  );
  const fieldIds = byField ? (findClub(club)?.fields.map((f) => f.id) ?? null) : null;
  const inPeriod = (p: SeriesPoint) => periodsForDate(p.date, data.referenceDate).includes(period);

  // Cards for every discipline shot at the club (and, with fields, every field it was shot on);
  // periods without data show "—".
  const disciplines = DISCIPLINE_KEYS.filter((k) => clubData.periods.allTime[k].count > 0);
  const cards: CardData[] = disciplines.flatMap((discipline) => {
    if (!fieldIds) {
      return [
        {
          discipline,
          stats: clubData.periods[period][discipline],
          points: clubData.series[discipline].filter(inPeriod),
        },
      ];
    }
    return fieldIds.flatMap((fieldId) => {
      const field = filterDashboard(clubData, (p) => p.fieldId === fieldId);
      if (field.periods.allTime[discipline].count === 0) return [];
      return [
        {
          discipline,
          fieldId,
          stats: field.periods[period][discipline],
          points: field.series[discipline].filter(inPeriod),
        },
      ];
    });
  });
  const averages: AverageBar[] = cards.flatMap(({ discipline, fieldId, stats }) => {
    const { avg, min, max } = stats;
    return avg === null || min === null || max === null
      ? []
      : [{ discipline, ...(fieldIds && { fieldId }), avg, min, max }];
  });
  const series = Object.fromEntries(
    disciplines.map((k) => [k, clubData.series[k].filter(inPeriod)]),
  ) as Partial<Record<DisciplineKey, SeriesPoint[]>>;
  const fieldLabel = (fieldId: string | undefined) =>
    fieldId === undefined ? undefined : t.clubs.field(fieldId);

  const hasSeries = DISCIPLINE_KEYS.some((k) => data.periods.allTime[k].count > 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.dashboard.title}</h1>
      {!hasSeries ? (
        <p className="py-8 text-center text-ink-muted">
          <Link to="/add" className="underline">
            {t.dashboard.empty}
          </Link>
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex flex-1 items-center gap-2 font-semibold">
              {t.dashboard.club}
              <select
                value={club}
                onChange={(e) => {
                  setClub(e.target.value);
                  store(CLUB_STORAGE_KEY, e.target.value);
                }}
                className="min-h-11 min-w-28 flex-1 rounded-xl border border-line bg-card px-3 font-normal"
              >
                {CLUBS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={ALL_CLUBS}>{t.dashboard.allClubs}</option>
              </select>
            </label>
            {club !== ALL_CLUBS && (
              <div className="flex shrink-0 items-center gap-1 font-semibold">
                <span aria-hidden>{t.dashboard.byField}</span>
                <Switch
                  checked={byField}
                  label={t.dashboard.byField}
                  onChange={() => {
                    setByField(!byField);
                    store(BY_FIELD_STORAGE_KEY, byField ? '0' : '1');
                  }}
                />
              </div>
            )}
          </div>
          <PeriodSwitcher value={period} onChange={setPeriod} />
          <ScoresChart series={series} fieldIds={fieldIds} sample={sample} />
          <AveragesChart averages={averages} sample={sample} />
          {cards.length === 0 ? (
            <p className="py-4 text-center text-ink-muted">{t.dashboard.noChartData}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {cards.map((c) => (
                <DisciplineCard
                  key={`${c.discipline}-${c.fieldId ?? 'all'}`}
                  discipline={c.discipline}
                  fieldLabel={fieldLabel(c.fieldId)}
                  stats={c.stats}
                  points={c.points}
                  sample={sample}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
