import {
  CHART_RANGES,
  chartRangeStart,
  DEFAULT_CHART_RANGE,
  type ChartRange,
  type DisciplineKey,
  type SeriesPoint,
} from '@shooting-clays/shared';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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

/**
 * One toggle button per discipline: all shown by default; a tap hides or shows that line. A hidden
 * discipline stays listed, greyed out with a dashed key and struck-through name, so its state is
 * never told by colour alone. Keys mirror the mark (a short line).
 */
function DisciplineToggles({
  disciplines,
  hidden,
  onToggle,
}: {
  disciplines: DisciplineKey[];
  hidden: ReadonlySet<DisciplineKey>;
  onToggle: (d: DisciplineKey) => void;
}) {
  return (
    <div role="group" aria-label={t.dashboard.legendLabel} className="mt-2 flex flex-wrap gap-1">
      {disciplines.map((d) => {
        const shown = !hidden.has(d);
        return (
          <button
            key={d}
            type="button"
            aria-pressed={shown}
            onClick={() => onToggle(d)}
            className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold ${
              shown ? 'text-ink' : 'text-ink-muted line-through opacity-60'
            }`}
          >
            <span
              aria-hidden
              className="h-0 w-4 border-t-2"
              style={{
                borderColor: shown ? disciplineColor(d) : 'var(--color-ink-muted)',
                borderStyle: shown ? 'solid' : 'dashed',
              }}
            />
            {t.disciplines[d]}
          </button>
        );
      })}
    </div>
  );
}

/** The chart's own time range (3 months by default), independent of the Dashboard period. */
function RangeSwitcher({
  value,
  onChange,
}: {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
}) {
  return (
    <div
      role="group"
      aria-label={t.dashboard.rangeLabel}
      className="mb-3 grid grid-cols-4 gap-1 rounded-xl border border-line bg-surface p-1"
    >
      {CHART_RANGES.map((r) => (
        <button
          key={r}
          type="button"
          aria-pressed={value === r}
          onClick={() => onChange(r)}
          className={`min-h-11 rounded-lg px-1 text-sm font-semibold ${
            value === r ? 'bg-accent text-accent-ink' : 'text-ink-muted'
          }`}
        >
          {t.dashboard.ranges[r]}
        </button>
      ))}
    </div>
  );
}

/**
 * Every score per discipline over the selected range (rolling, counted back from the reference
 * date). Range and hidden disciplines are per visit.
 */
export function ScoresChart({
  series: allSeries,
  referenceDate,
  sample = false,
}: {
  series: Partial<Record<DisciplineKey, SeriesPoint[]>>;
  referenceDate: string;
  sample?: boolean;
}) {
  const [range, setRange] = useState<ChartRange>(DEFAULT_CHART_RANGE);
  const [hidden, setHidden] = useState<ReadonlySet<DisciplineKey>>(new Set());
  const start = chartRangeStart(range, referenceDate);
  const series = Object.fromEntries(
    Object.entries(allSeries).map(([k, points]) => [
      k,
      start ? points.filter((p) => p.date >= start) : points,
    ]),
  ) as Partial<Record<DisciplineKey, SeriesPoint[]>>;
  const disciplines = (Object.keys(series) as DisciplineKey[]).filter((k) => series[k]?.length);
  const visible = disciplines.filter((d) => !hidden.has(d));
  const rows = toScoreRows(series);
  const toggle = (d: DisciplineKey) =>
    setHidden((current) => {
      const next = new Set(current);
      if (!next.delete(d)) next.add(d);
      return next;
    });
  return (
    <ChartCard title={t.dashboard.scoresChart} sample={sample}>
      <RangeSwitcher value={range} onChange={setRange} />
      {rows.length === 0 ? (
        <p className="text-ink-muted">{t.dashboard.noChartData}</p>
      ) : (
        <>
          {visible.length === 0 ? (
            <p className="flex h-64 items-center justify-center text-center text-ink-muted">
              {t.dashboard.allHidden}
            </p>
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
                  {/* Hidden lines are left out; colours follow the discipline, the Y axis stays 0–25. */}
                  {visible.map((d) => (
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
          {disciplines.length > 1 && (
            <DisciplineToggles disciplines={disciplines} hidden={hidden} onToggle={toggle} />
          )}
        </>
      )}
    </ChartCard>
  );
}

export interface AverageBar {
  discipline: DisciplineKey;
  avg: number;
  min: number;
  max: number;
}

interface BarLabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  index?: number;
}

/**
 * Drawn over each bar: the min–max range as a thin whisker, and above it the average (bold) with
 * "min–max" underneath. Bar height is the average, so the whisker ends are placed with the same
 * scale (pixels per point = bar height / average).
 */
function rangeLabel(rows: AverageBar[]) {
  function RangeLabel(props: BarLabelProps) {
    const row = rows[props.index ?? -1];
    if (!row) return null;
    const [x, y, width, height] = [props.x, props.y, props.width, props.height].map(Number) as [
      number,
      number,
      number,
      number,
    ];
    const base = y + height;
    const perPoint = row.avg > 0 ? height / row.avg : 0;
    const top = base - row.max * perPoint;
    const bottom = base - row.min * perPoint;
    const cx = x + width / 2;
    const cap = Math.min(10, width / 2);
    return (
      <g data-testid={`range-${row.discipline}`}>
        {row.max > row.min && (
          <g stroke="var(--color-ink)" strokeWidth={1.5} strokeLinecap="round">
            <line x1={cx} x2={cx} y1={top} y2={bottom} />
            <line x1={cx - cap / 2} x2={cx + cap / 2} y1={top} y2={top} />
            <line x1={cx - cap / 2} x2={cx + cap / 2} y1={bottom} y2={bottom} />
          </g>
        )}
        <text
          x={cx}
          y={top - 20}
          textAnchor="middle"
          fill="var(--color-ink)"
          fontSize={14}
          fontWeight={700}
        >
          {row.avg}
        </text>
        <text x={cx} y={top - 6} textAnchor="middle" fill="var(--color-ink-muted)" fontSize={11}>
          {t.dashboard.range(row.min, row.max)}
        </text>
      </g>
    );
  }
  return RangeLabel;
}

function AverageTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: AverageBar & { name: string } }[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div style={tooltipStyle} className="px-3 py-2 text-sm">
      <p className="font-semibold">{row.name}</p>
      <p>
        <strong>{row.avg}</strong> {t.dashboard.average.toLowerCase()}
      </p>
      <p className="text-ink-muted">
        {t.dashboard.min} {row.min} · {t.dashboard.max} {row.max}
      </p>
    </div>
  );
}

export function AveragesChart({
  averages,
  sample = false,
}: {
  averages: AverageBar[];
  sample?: boolean;
}) {
  const rows = averages.map((a) => ({ ...a, name: t.disciplines[a.discipline] }));
  return (
    <ChartCard title={t.dashboard.averagesChart} sample={sample}>
      {rows.length === 0 ? (
        <p className="text-ink-muted">{t.dashboard.noChartData}</p>
      ) : (
        <>
          <div className="h-64" role="img" aria-label={t.dashboard.averagesChart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rows}
                // Room above the tallest whisker (a max of 25) for the two labels.
                margin={{ top: 40, right: 8, bottom: 0, left: -20 }}
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
                <Tooltip cursor={{ fill: 'var(--chart-grid)' }} content={<AverageTooltip />} />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {rows.map((r) => (
                    <Cell key={r.discipline} fill={disciplineColor(r.discipline)} />
                  ))}
                  <LabelList dataKey="avg" content={rangeLabel(rows)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-ink-muted">{t.dashboard.averagesKey}</p>
        </>
      )}
    </ChartCard>
  );
}
