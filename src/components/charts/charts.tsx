"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  compactJa,
  formatDate,
  formatDecimal,
  formatNumber,
  formatYen,
  formatYenCompact,
  formatYm,
} from "@/lib/format";

const AXIS = "#94a3b8";
const GRID = "rgba(148,163,184,0.18)";

// Formatters are referenced by string key — functions can't cross the
// server→client boundary, so pages pass keys and we resolve them here.
export type YKey = "yen" | "yenCompact" | "number" | "person" | "count" | "decimalX";
export type XKey = "none" | "month" | "day";

const Y_FMT: Record<YKey, (v: number) => string> = {
  yen: formatYen,
  yenCompact: formatYenCompact,
  number: formatNumber,
  person: (v) => `${formatNumber(v)}人`,
  count: (v) => `${formatNumber(v)}件`,
  decimalX: (v) => `${formatDecimal(v)}x`,
};

const X_FMT: Record<XKey, (v: string) => string> = {
  none: (v) => v,
  month: (v) => formatYm(v),
  day: (v) => formatDate(v),
};

interface Series {
  key: string;
  name: string;
  color: string;
  type?: "area" | "line";
  dashed?: boolean;
  stackId?: string;
}

function Tip({
  active,
  payload,
  label,
  xKey = "none",
  yKey = "yenCompact",
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  xKey?: XKey;
  yKey?: YKey;
}) {
  if (!active || !payload?.length) return null;
  const xf = X_FMT[xKey];
  const yf = Y_FMT[yKey];
  return (
    <div className="min-w-[140px] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-pop backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        {typeof label === "string" ? xf(label) : label}
      </div>
      <div className="space-y-1">
        {payload
          .filter((p) => p.value !== null && p.value !== undefined)
          .map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color || p.fill }} />
              <span className="text-slate-600 dark:text-slate-300">{p.name}</span>
              <span className="ml-auto font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {yf(Number(p.value))}
              </span>
            </div>
          ))}
      </div>
    </div>
  );
}

// ---- Composed trend (areas + lines) -------------------------------------

export function TrendChart({
  data,
  series,
  xKey = "label",
  height = 260,
  yFormat = "yenCompact",
  xFormat = "none",
  referenceX,
}: {
  data: any[];
  series: Series[];
  xKey?: string;
  height?: number;
  yFormat?: YKey;
  xFormat?: XKey;
  referenceX?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey={xKey}
          tickFormatter={(v) => X_FMT[xFormat](String(v))}
          tick={{ fontSize: 11, fill: AXIS }}
          axisLine={false}
          tickLine={false}
          minTickGap={16}
        />
        <YAxis
          tickFormatter={(v) => compactJa(Number(v))}
          tick={{ fontSize: 11, fill: AXIS }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={(p: any) => <Tip {...p} xKey={xFormat} yKey={yFormat} />} />
        {referenceX && <ReferenceLine x={referenceX} stroke={AXIS} strokeDasharray="3 3" />}
        {series.map((s) =>
          s.type === "line" ? (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2.2}
              strokeDasharray={s.dashed ? "5 4" : undefined}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ) : (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2.2}
              strokeDasharray={s.dashed ? "5 4" : undefined}
              fill={`url(#grad-${s.key})`}
              stackId={s.stackId}
              connectNulls
            />
          ),
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ---- Bars (vertical / horizontal, grouped / stacked) --------------------

export function BarsChart({
  data,
  series,
  xKey = "label",
  height = 260,
  layout = "horizontal",
  yFormat = "yenCompact",
  xFormat = "none",
  radius = 6,
}: {
  data: any[];
  series: Series[];
  xKey?: string;
  height?: number;
  layout?: "horizontal" | "vertical";
  yFormat?: YKey;
  xFormat?: XKey;
  radius?: number;
}) {
  const vertical = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        layout={layout}
        margin={{ top: 8, right: 12, left: vertical ? 8 : 0, bottom: 0 }}
        barCategoryGap={vertical ? "22%" : "26%"}
      >
        <CartesianGrid stroke={GRID} horizontal={!vertical} vertical={vertical} />
        {vertical ? (
          <>
            <XAxis type="number" tickFormatter={(v) => compactJa(Number(v))} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey={xKey} tickFormatter={(v) => X_FMT[xFormat](String(v))} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={108} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tickFormatter={(v) => X_FMT[xFormat](String(v))} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} minTickGap={8} />
            <YAxis tickFormatter={(v) => compactJa(Number(v))} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={48} />
          </>
        )}
        <Tooltip cursor={{ fill: "rgba(148,163,184,0.08)" }} content={(p: any) => <Tip {...p} xKey={xFormat} yKey={yFormat} />} />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            stackId={s.stackId}
            radius={vertical ? [0, radius, radius, 0] : [radius, radius, 0, 0]}
            maxBarSize={vertical ? 26 : 56}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ---- Donut --------------------------------------------------------------

export function DonutChart({
  data,
  height = 220,
  valueFormat = "yenCompact",
  centerLabel,
  centerValue,
}: {
  data: { name: string; value: number; color: string }[];
  height?: number;
  valueFormat?: YKey;
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="none">
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip content={(p: any) => <Tip {...p} yKey={valueFormat} />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && <span className="text-xs text-slate-500 dark:text-slate-400">{centerLabel}</span>}
          {centerValue && <span className="text-lg font-bold tnum text-slate-900 dark:text-slate-100">{centerValue}</span>}
        </div>
      )}
    </div>
  );
}

// ---- Sparkline ----------------------------------------------------------

export function Sparkline({
  data,
  color = "#0f766e",
  height = 40,
}: {
  data: number[];
  color?: string;
  height?: number;
}) {
  const chartData = data.map((value, i) => ({ i, value }));
  const id = `spk-${color.replace("#", "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${id})`} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
