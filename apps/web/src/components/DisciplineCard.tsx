import type { DisciplineKey, PeriodStats, SeriesPoint } from '@shooting-clays/shared';
import { Line, LineChart, ResponsiveContainer, YAxis } from 'recharts';
import { t } from '../i18n/en';
import { disciplineColor } from '../lib/colors';
import { formatStat } from '../lib/format';
import { SampleBadge } from './SampleBadge';

interface Props {
  discipline: DisciplineKey;
  stats: PeriodStats;
  points: SeriesPoint[];
  /** Sample data (pending account): labelled as such. */
  sample?: boolean;
}

export function DisciplineCard({ discipline, stats, points, sample = false }: Props) {
  const name = t.disciplines[discipline];
  return (
    <article
      aria-label={name}
      data-testid={`card-${discipline}`}
      className="rounded-2xl border border-line bg-card p-4 shadow-sm"
    >
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <span
          aria-hidden
          className="size-3 rounded-full"
          style={{ background: disciplineColor(discipline) }}
        />
        {name}
        {sample && <SampleBadge />}
      </h2>
      <div className="mt-2 flex items-end justify-between gap-4">
        <div>
          <p className="text-5xl leading-none font-bold tabular-nums" data-testid="avg">
            {formatStat(stats.avg)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">{t.dashboard.average}</p>
        </div>
        {points.length > 1 && (
          <div className="h-12 w-28" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={points}
                accessibilityLayer={false}
                margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
              >
                <YAxis hide domain={[0, 25]} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={disciplineColor(discipline)}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface py-1.5">
          <dt className="text-xs text-ink-muted">{t.dashboard.min}</dt>
          <dd className="text-lg font-semibold tabular-nums" data-testid="min">
            {formatStat(stats.min)}
          </dd>
        </div>
        <div className="rounded-lg bg-surface py-1.5">
          <dt className="text-xs text-ink-muted">{t.dashboard.max}</dt>
          <dd className="text-lg font-semibold tabular-nums" data-testid="max">
            {formatStat(stats.max)}
          </dd>
        </div>
        <div className="rounded-lg bg-surface py-1.5">
          <dt className="text-xs text-ink-muted">{t.dashboard.seriesLabel}</dt>
          <dd className="text-lg font-semibold tabular-nums" data-testid="count">
            {stats.count}
          </dd>
        </div>
      </dl>
    </article>
  );
}
