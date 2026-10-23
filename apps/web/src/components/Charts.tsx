import type { DisciplineKey, SeriesPoint } from '@shooting-clays/shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { t } from '../i18n/en';
import { disciplineColor } from '../lib/colors';
import { formatShortDate } from '../lib/format';
import { SampleBadge } from './SampleBadge';

const axisTick = { fill: 'var(--color-ink-muted)', fontSize: 12 };
const tooltipStyle = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-line)',
  borderRadius: 8,
  color: 'var(--color-ink)',
};

function ChartCard({
  title,
  sample,
  children,
}: {
  title: string;
  sample: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-card p-4 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
        {title}
        {sample && <SampleBadge />}
      </h2>
      {children}
    </section>
  );
}

/** One row per date with the day's average score per discipline (lines skip missing days). */
export function toScoreRows(series: Partial<Record<DisciplineKey, SeriesPoint[]>>) {
  const byDate = new Map<string, Partial<Record<DisciplineKey, number[]>>>();
  for (const [discipline, points] of Object.entries(series) as [DisciplineKey, SeriesPoint[]][]) {
    for (const { date, score } of points) {
      const row = byDate.get(date) ?? {};
      (row[discipline] ??= []).push(score);
      byDate.set(date, row);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, row]) => ({
      date,
      ...Object.fromEntries(
        Object.entries(row).map(([k, scores]) => [
          k,
          Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        ]),
      ),
    }));
}

export function ScoresChart({
  series,
  sample = false,
}: {
  series: Partial<Record<DisciplineKey, SeriesPoint[]>>;
  sample?: boolean;
}) {
  const disciplines = (Object.keys(series) as DisciplineKey[]).filter((k) => series[k]?.length);
  const rows = toScoreRows(series);
  return (
    <ChartCard title={t.dashboard.scoresChart} sample={sample}>
      {rows.length === 0 ? (
        <p className="text-ink-muted">{t.dashboard.noChartData}</p>
      ) : (
        <div className="h-64" role="img" aria-label={t.dashboard.scoresChart}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                tick={axisTick}
                stroke="var(--color-line)"
                minTickGap={24}
              />
              <YAxis
                domain={[0, 25]}
                ticks={[0, 5, 10, 15, 20, 25]}
                tick={axisTick}
                stroke="var(--color-line)"
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(d) => formatShortDate(String(d))}
                formatter={(value, name) => [value, t.disciplines[name as DisciplineKey]]}
              />
              {disciplines.length > 1 && (
                <Legend
                  formatter={(name: string) => (
                    // Legend text uses the ink colour; the swatch carries the series colour.
                    <span style={{ color: 'var(--color-ink)' }}>
                      {t.disciplines[name as DisciplineKey]}
                    </span>
                  )}
                />
              )}
              {disciplines.map((d) => (
                <Line
                  key={d}
                  type="monotone"
                  dataKey={d}
                  stroke={disciplineColor(d)}
                  strokeWidth={2}
                  dot={{
                    r: 4,
                    strokeWidth: 2,
                    stroke: 'var(--color-card)',
                    fill: disciplineColor(d),
                  }}
                  activeDot={{ r: 6 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}

export function AveragesChart({
  averages,
  sample = false,
}: {
  averages: { discipline: DisciplineKey; avg: number }[];
  sample?: boolean;
}) {
  const rows = averages.map((a) => ({ ...a, name: t.disciplines[a.discipline] }));
  return (
    <ChartCard title={t.dashboard.averagesChart} sample={sample}>
      {rows.length === 0 ? (
        <p className="text-ink-muted">{t.dashboard.noChartData}</p>
      ) : (
        <div className="h-56" role="img" aria-label={t.dashboard.averagesChart}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 20, right: 8, bottom: 0, left: -20 }}
              barCategoryGap="30%"
            >
              <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
              <XAxis dataKey="name" tick={axisTick} stroke="var(--color-line)" interval={0} />
              <YAxis
                domain={[0, 25]}
                ticks={[0, 5, 10, 15, 20, 25]}
                tick={axisTick}
                stroke="var(--color-line)"
              />
              <Tooltip
                cursor={{ fill: 'var(--chart-grid)' }}
                contentStyle={tooltipStyle}
                formatter={(value) => [value, t.dashboard.average]}
              />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.discipline} fill={disciplineColor(r.discipline)} />
                ))}
                <LabelList
                  dataKey="avg"
                  position="top"
                  fill="var(--color-ink)"
                  fontSize={13}
                  fontWeight={600}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  );
}
