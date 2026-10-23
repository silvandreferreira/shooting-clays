import {
  DISCIPLINE_KEYS,
  PERIODS,
  periodsForDate,
  type DisciplineKey,
  type Period,
} from '@shooting-clays/shared';
import { useState } from 'react';
import { Link } from 'react-router';
import { AveragesChart, ScoresChart } from '../components/Charts';
import { DisciplineCard } from '../components/DisciplineCard';
import { t } from '../i18n/en';
import { useDashboard } from '../lib/queries';

function PeriodSwitcher({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div
      role="group"
      aria-label={t.dashboard.periodLabel}
      className="grid grid-cols-3 gap-1 rounded-xl border border-line bg-card p-1"
    >
      {PERIODS.map((p) => (
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

export function DashboardPage() {
  const [period, setPeriod] = useState<Period>('allTime');
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

  // Cards for every discipline that has ever been shot; periods without data show "—".
  const disciplines = DISCIPLINE_KEYS.filter((k) => data.periods.allTime[k].count > 0);
  const stats = data.periods[period];
  const series = Object.fromEntries(
    disciplines.map((k) => [
      k,
      data.series[k].filter((p) => periodsForDate(p.date, data.referenceDate).includes(period)),
    ]),
  ) as Partial<Record<DisciplineKey, (typeof data.series)[DisciplineKey]>>;
  const averages = disciplines.flatMap((k) => {
    const avg = stats[k].avg;
    return avg === null ? [] : [{ discipline: k, avg }];
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.dashboard.title}</h1>
      <PeriodSwitcher value={period} onChange={setPeriod} />
      {disciplines.length === 0 ? (
        <p className="py-8 text-center text-ink-muted">
          <Link to="/add" className="underline">
            {t.dashboard.empty}
          </Link>
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {disciplines.map((k) => (
              <DisciplineCard key={k} discipline={k} stats={stats[k]} points={series[k] ?? []} />
            ))}
          </div>
          <ScoresChart series={series} />
          <AveragesChart averages={averages} />
        </>
      )}
    </div>
  );
}
