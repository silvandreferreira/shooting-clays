import type { DisciplineKey, SeriesPoint } from '@shooting-clays/shared';
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
import { useT, type Strings } from '../i18n';
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

type ScorePoint = Pick<SeriesPoint, 'date' | 'score'> & { fieldId?: string };

export interface ScoreRow {
  key: string;
  date: string;
  /** The field of each discipline's series in this row. */
  fields: Partial<Record<DisciplineKey, string>>;
  [discipline: string]: unknown;
}

/**
 * One row per series, never an average (scores are whole numbers): a day with two series of a
 * discipline gives two rows, so two points on that date. Disciplines shot the same day share
 * rows; `key` (date#n) keeps the rows apart on the X axis. Lines skip missing days.
 */
export function toScoreRows(series: Partial<Record<DisciplineKey, ScorePoint[]>>): ScoreRow[] {
  const byDate = new Map<string, Partial<Record<DisciplineKey, ScorePoint[]>>>();
  for (const [discipline, points] of Object.entries(series) as [DisciplineKey, ScorePoint[]][]) {
    for (const point of points) {
      const row = byDate.get(point.date) ?? {};
      (row[discipline] ??= []).push(point);
      byDate.set(point.date, row);
    }
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([date, row]) => {
      const rows = Math.max(...Object.values(row).map((points) => points.length));
      return Array.from({ length: rows }, (_, i) => {
        const here = (Object.entries(row) as [DisciplineKey, ScorePoint[]][]).filter(
          ([, points]) => i < points.length,
        );
        return {
          key: `${date}#${i}`,
          date,
          fields: Object.fromEntries(
            here.flatMap(([k, points]) => (points[i]!.fieldId ? [[k, points[i]!.fieldId]] : [])),
          ),
          ...Object.fromEntries(here.map(([k, points]) => [k, points[i]!.score])),
        };
      });
    });
}

const dateOfKey = (key: string) => formatShortDate(key.slice(0, 10));

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
  const t = useT();
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

const FIELD_SHAPES = ['circle', 'square', 'triangle', 'diamond'] as const;
type FieldShape = (typeof FIELD_SHAPES)[number];

/** With fields considered, each field of the club has its own marker. */
function fieldShape(fieldIds: readonly string[], fieldId: string | undefined): FieldShape {
  const index = fieldId === undefined ? 0 : Math.max(0, fieldIds.indexOf(fieldId));
  return FIELD_SHAPES[index % FIELD_SHAPES.length]!;
}

function ShapeMark({
  shape,
  cx,
  cy,
  r,
  fill,
}: {
  shape: FieldShape;
  cx: number;
  cy: number;
  r: number;
  fill: string;
}) {
  const stroke = { stroke: 'var(--color-card)', strokeWidth: 1.5 };
  switch (shape) {
    case 'square':
      return <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={fill} {...stroke} />;
    case 'triangle':
      return (
        <path
          d={`M${cx} ${cy - r * 1.2}L${cx + r * 1.15} ${cy + r * 0.85}H${cx - r * 1.15}Z`}
          fill={fill}
          {...stroke}
        />
      );
    case 'diamond':
      return (
        <path
          d={`M${cx} ${cy - r * 1.3}L${cx + r * 1.3} ${cy}L${cx} ${cy + r * 1.3}L${cx - r * 1.3} ${cy}Z`}
          fill={fill}
          {...stroke}
        />
      );
    default:
      return <circle cx={cx} cy={cy} r={r} fill={fill} {...stroke} />;
  }
}

/** Which marker is which field (only the fields in the chart). */
function ShapeLegend({ fieldIds, shown }: { fieldIds: readonly string[]; shown: string[] }) {
  const t = useT();
  return (
    <ul aria-label={t.dashboard.shapesLabel} className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-3">
      {shown.map((fieldId) => (
        <li key={fieldId} className="flex items-center gap-1.5 text-sm text-ink-muted">
          <svg aria-hidden viewBox="0 0 16 16" className="size-4">
            <ShapeMark
              shape={fieldShape(fieldIds, fieldId)}
              cx={8}
              cy={8}
              r={5}
              fill="var(--color-ink-muted)"
            />
          </svg>
          {t.clubs.field(fieldId)}
        </li>
      ))}
    </ul>
  );
}

/**
 * Every score per discipline in the Dashboard period (the series come filtered by period, club
 * and field). With `fieldIds` (fields considered), each point's marker tells its field. Hidden
 * disciplines are per visit.
 */
export function ScoresChart({
  series,
  fieldIds = null,
  sample = false,
}: {
  series: Partial<Record<DisciplineKey, ScorePoint[]>>;
  fieldIds?: readonly string[] | null;
  sample?: boolean;
}) {
  const t = useT();
  const [hidden, setHidden] = useState<ReadonlySet<DisciplineKey>>(new Set());
  const disciplines = (Object.keys(series) as DisciplineKey[]).filter((k) => series[k]?.length);
  const visible = disciplines.filter((d) => !hidden.has(d));
  const rows = toScoreRows(series);
  const shownFields = fieldIds
    ? fieldIds.filter((f) => visible.some((d) => series[d]?.some((p) => p.fieldId === f)))
    : [];
  const fieldName = (fieldId: string | undefined) => (fieldId ? t.clubs.field(fieldId) : '');
  const toggle = (d: DisciplineKey) =>
    setHidden((current) => {
      const next = new Set(current);
      if (!next.delete(d)) next.add(d);
      return next;
    });
  return (
    <ChartCard title={t.dashboard.scoresChart} sample={sample}>
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
                    dataKey="key"
                    tickFormatter={dateOfKey}
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
                    labelFormatter={(key) => dateOfKey(String(key))}
                    formatter={(value, name, item) => {
                      const discipline = name as DisciplineKey;
                      const row = item.payload as ScoreRow | undefined;
                      return [
                        fieldIds
                          ? `${String(value)} · ${fieldName(row?.fields[discipline])}`
                          : value,
                        t.disciplines[discipline],
                      ];
                    }}
                  />
                  {/* Hidden lines are left out; colours follow the discipline, the Y axis stays 0–25. */}
                  {visible.map((d) => (
                    <Line
                      key={d}
                      type="monotone"
                      dataKey={d}
                      stroke={disciplineColor(d)}
                      strokeWidth={2}
                      dot={
                        fieldIds
                          ? (props: {
                              cx?: number;
                              cy?: number;
                              index?: number;
                              payload?: ScoreRow;
                            }) =>
                              props.cx == null || props.cy == null || props.payload?.[d] == null ? (
                                <g key={`${d}-${props.index}`} />
                              ) : (
                                <ShapeMark
                                  key={`${d}-${props.index}`}
                                  shape={fieldShape(fieldIds, props.payload.fields[d])}
                                  cx={props.cx}
                                  cy={props.cy}
                                  r={4.5}
                                  fill={disciplineColor(d)}
                                />
                              )
                          : {
                              r: 4,
                              strokeWidth: 2,
                              stroke: 'var(--color-card)',
                              fill: disciplineColor(d),
                            }
                      }
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
          {fieldIds && shownFields.length > 0 && (
            <ShapeLegend fieldIds={fieldIds} shown={shownFields} />
          )}
        </>
      )}
    </ChartCard>
  );
}

export interface AverageBar {
  discipline: DisciplineKey;
  /** With fields considered: the bar's field. Absent: every field. */
  fieldId?: string;
  avg: number;
  min: number;
  max: number;
}

type AverageRow = AverageBar & {
  key: string;
  /** Under the bar: the discipline, or the short field name when fields are considered. */
  name: string;
  /** In the tooltip: the discipline, and the field when considered. */
  title: string;
};

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
function rangeLabel(rows: AverageRow[], t: Strings) {
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
      <g data-testid={`range-${row.key}`}>
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
        {/* Many narrow bars (fields considered): the whisker and the tooltip show the range. */}
        {rows.length <= 5 && (
          <text x={cx} y={top - 6} textAnchor="middle" fill="var(--color-ink-muted)" fontSize={11}>
            {t.dashboard.range(row.min, row.max)}
          </text>
        )}
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
  payload?: readonly { payload?: AverageRow }[];
}) {
  const t = useT();
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div style={tooltipStyle} className="px-3 py-2 text-sm">
      <p className="font-semibold">{row.title}</p>
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
  const t = useT();
  const byField = averages.some((a) => a.fieldId !== undefined);
  const rows: AverageRow[] = averages.map((a) => {
    const discipline = t.disciplines[a.discipline];
    if (a.fieldId === undefined)
      return { ...a, key: a.discipline, name: discipline, title: discipline };
    return {
      ...a,
      key: `${a.discipline}-${a.fieldId}`,
      name: t.dashboard.fieldShort(a.fieldId),
      title: `${discipline} · ${t.clubs.field(a.fieldId)}`,
    };
  });
  const names = new Map(rows.map((r) => [r.key, r.name]));
  const disciplines = [...new Set(rows.map((r) => r.discipline))];
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
                <XAxis
                  dataKey="key"
                  tickFormatter={(key) => names.get(String(key)) ?? ''}
                  tick={axisTick}
                  stroke="var(--color-line)"
                  interval={0}
                />
                <YAxis
                  domain={[0, 25]}
                  ticks={[0, 5, 10, 15, 20, 25]}
                  tick={axisTick}
                  stroke="var(--color-line)"
                />
                <Tooltip cursor={{ fill: 'var(--chart-grid)' }} content={<AverageTooltip />} />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {rows.map((r) => (
                    <Cell key={r.key} fill={disciplineColor(r.discipline)} />
                  ))}
                  <LabelList dataKey="avg" content={rangeLabel(rows, t)} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {byField && (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {disciplines.map((d) => (
                <li key={d} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="size-3 rounded-sm"
                    style={{ background: disciplineColor(d) }}
                  />
                  {t.disciplines[d]}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-ink-muted">
            {t.dashboard.averagesKey}
            {byField && ` ${t.dashboard.fieldsKey}`}
          </p>
        </>
      )}
    </ChartCard>
  );
}
