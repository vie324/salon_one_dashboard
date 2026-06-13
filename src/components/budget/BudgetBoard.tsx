"use client";

import { Building2, RotateCcw, Sliders, Store as StoreIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import type { BudgetData } from "@/lib/data";
import { formatNumber, formatPercent, formatYenCompact } from "@/lib/format";
import {
  BUDGET_METRICS,
  BUDGET_STORAGE_KEY,
  SCENARIOS,
  achievement,
  paceStatus,
  presetGrowth,
  targetFor,
  type BudgetMetricKey,
  type ScenarioKey,
} from "@/lib/budget";
import { CATEGORY_LABEL, type SalonCategory } from "@/lib/types";

type Metrics = Record<BudgetMetricKey, number>;

function fmt(metric: BudgetMetricKey, v: number): string {
  const kind = BUDGET_METRICS.find((m) => m.key === metric)!.kind;
  return kind === "yen" ? formatYenCompact(v) : `${formatNumber(v)}${metric === "customers" || metric === "newCustomers" ? "人" : ""}`;
}

const RING = { success: "#16a34a", warning: "#d97706", danger: "#e11d48" } as const;

export function BudgetBoard({ data }: { data: BudgetData }) {
  const categories = useMemo(
    () => Array.from(new Set(data.brands.map((b) => b.category))) as SalonCategory[],
    [data.brands],
  );

  const [growth, setGrowth] = useState<Record<SalonCategory, number>>(() => presetGrowth("standard"));
  const [scope, setScope] = useState<"brand" | "store">("brand");
  const [scenario, setScenario] = useState<ScenarioKey | "custom">("standard");
  const [loaded, setLoaded] = useState(false);

  // load saved config
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUDGET_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.growth) setGrowth((g) => ({ ...g, ...saved.growth }));
        if (saved.scope) setScope(saved.scope);
        if (saved.scenario) setScenario(saved.scenario);
      }
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // persist
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify({ growth, scope, scenario }));
    } catch {
      /* ignore */
    }
  }, [growth, scope, scenario, loaded]);

  function applyScenario(key: ScenarioKey) {
    setGrowth(presetGrowth(key));
    setScenario(key);
  }
  function setGenre(cat: SalonCategory, pct: number) {
    setGrowth((g) => ({ ...g, [cat]: Math.max(0, Math.min(1, pct / 100)) }));
    setScenario("custom");
  }

  const elapsed = data.period.elapsedFraction;

  // company targets = sum of per-brand targets (genre-aware)
  const companyTarget = useMemo(() => {
    const t = { revenue: 0, profit: 0, customers: 0, newCustomers: 0 } as Metrics;
    for (const b of data.brands) {
      for (const m of BUDGET_METRICS) {
        t[m.key] += targetFor(m.key, b.baseline[m.key], growth[b.category] ?? 0);
      }
    }
    return t;
  }, [data.brands, growth]);

  const rows = scope === "brand" ? data.brands : data.stores;

  return (
    <div className="space-y-4">
      {/* scenario controls */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">成長シナリオ</span>
            {SCENARIOS.map((s) => (
              <button
                key={s.key}
                onClick={() => applyScenario(s.key)}
                title={s.desc}
                className={cn(
                  "btn btn-sm",
                  scenario === s.key ? "btn-primary" : "btn-outline",
                )}
              >
                {s.label}
              </button>
            ))}
            {scenario === "custom" && <Badge tone="warning">カスタム</Badge>}
            <button onClick={() => applyScenario("standard")} className="btn btn-ghost btn-sm text-slate-500" title="標準に戻す">
              <RotateCcw className="h-3.5 w-3.5" /> リセット
            </button>
          </div>
          <div className="text-xs text-slate-400">
            対象 {data.period.label} ／ 基準 {data.period.compareLabel}（前年） ／ 期間経過 {formatPercent(elapsed, 0)}
          </div>
        </div>
      </Card>

      {/* headline metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {BUDGET_METRICS.map((m) => {
          const target = companyTarget[m.key];
          // The monthly value already represents the full-period landing.
          const forecast = data.company.actual[m.key];
          const toDate = forecast * elapsed; // actual so far (pace-adjusted)
          const ach = achievement(toDate, target);
          const fAch = achievement(forecast, target);
          const pace = paceStatus(fAch);
          const ringColor = RING[pace.tone];
          return (
            <Card key={m.key} className="card-hover p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{m.label}</p>
                  <p className="mt-1 text-[11px] text-slate-400">着地見込</p>
                  <p className="text-2xl font-bold tnum text-slate-900 dark:text-slate-50">{fmt(m.key, forecast)}</p>
                </div>
                <Ring pct={fAch} color={ringColor} />
              </div>
              <div className="mt-3 space-y-1.5 border-t pt-3 text-sm">
                <Line label="目標" value={fmt(m.key, target)} strong />
                <Line label="実績" value={fmt(m.key, toDate)} sub={`達成率 ${formatPercent(ach, 0)}`} />
              </div>
              <div className="mt-3">
                <Badge tone={pace.tone}>{pace.label}・着地 {formatPercent(fAch, 0)}</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* genre growth editor */}
        <Card className="xl:col-span-4">
          <CardHeader title="業態別 目標成長率" subtitle="ジャンルごとに前年比の目標を設定（編集可・自動保存）" icon={<Sliders className="h-[18px] w-[18px]" />} />
          <div className="space-y-3 px-5 pb-5 pt-2">
            {categories.map((cat) => (
              <div key={cat} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700 dark:text-slate-200">{CATEGORY_LABEL[cat]}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">前年比</span>
                  <span className="text-slate-400">+</span>
                  <input
                    type="number"
                    value={Math.round((growth[cat] ?? 0) * 100)}
                    onChange={(e) => setGenre(cat, Number(e.target.value))}
                    className="input h-8 w-16 text-right tnum"
                    min={0}
                    max={100}
                    step={1}
                  />
                  <span className="text-sm text-slate-500">%</span>
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11px] leading-relaxed text-slate-400">
              業態（ジャンル）ごとに成長前提を変えられます。会社や事業の特性に合わせてシナリオを選び、必要に応じて個別調整してください。目標は前年同期の実績に成長率を乗じて自動算出します。
            </p>
          </div>
        </Card>

        {/* breakdown */}
        <Card className="xl:col-span-8">
          <CardHeader
            title="予実 内訳"
            subtitle="目標・着地見込・達成率"
            actions={
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                <ToggleBtn active={scope === "brand"} onClick={() => setScope("brand")} icon={<Building2 className="h-3.5 w-3.5" />} label="ブランド" />
                <ToggleBtn active={scope === "store"} onClick={() => setScope("store")} icon={<StoreIcon className="h-3.5 w-3.5" />} label="店舗" />
              </div>
            }
          />
          <div className="mt-2 overflow-x-auto px-2 pb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="th">{scope === "brand" ? "ブランド" : "店舗"}</th>
                  <th className="th text-right">売上目標</th>
                  <th className="th text-right">売上着地見込</th>
                  <th className="th">達成率（売上）</th>
                  <th className="th text-right">利益達成率</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const color = "color" in r ? r.color : r.brandColor;
                  const revTarget = targetFor("revenue", r.baseline.revenue, growth[r.category] ?? 0);
                  const revForecast = r.actual.revenue; // full-period landing
                  const revAch = achievement(revForecast, revTarget);
                  const profitTarget = targetFor("profit", r.baseline.profit, growth[r.category] ?? 0);
                  const profitForecast = r.actual.profit;
                  const profitAch = achievement(profitForecast, profitTarget);
                  return (
                    <tr key={r.id} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
                      <td className="td">
                        <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                          {r.name}
                        </span>
                      </td>
                      <td className="td text-right tnum">{formatYenCompact(revTarget)}</td>
                      <td className="td text-right tnum">{formatYenCompact(revForecast)}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={revAch} tone={revAch >= 1 ? "emerald" : revAch >= 0.95 ? "amber" : "rose"} className="w-24" />
                          <span className="w-10 text-right text-xs tnum text-slate-500">{formatPercent(revAch, 0)}</span>
                        </div>
                      </td>
                      <td className={cn("td text-right tnum font-medium", profitAch >= 1 ? "text-emerald-600 dark:text-emerald-400" : profitAch >= 0.95 ? "text-amber-600 dark:text-amber-400" : "text-rose-600 dark:text-rose-400")}>
                        {formatPercent(profitAch, 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Ring({ pct, color }: { pct: number; color: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" className="stroke-slate-100 dark:stroke-slate-800" />
        <circle cx="32" cy="32" r={r} fill="none" strokeWidth="7" stroke={color} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} style={{ transition: "stroke-dashoffset .6s cubic-bezier(.16,1,.3,1)" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tnum text-slate-700 dark:text-slate-200">
        {Math.round(p * 100)}%
      </span>
    </div>
  );
}

function Line({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="flex items-baseline gap-2">
        {sub && <span className="text-xs text-slate-400">{sub}</span>}
        <span className={cn("tnum", strong ? "font-bold text-slate-900 dark:text-slate-50" : "text-slate-700 dark:text-slate-200")}>{value}</span>
      </span>
    </div>
  );
}

function ToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
        active ? "bg-white text-brand-700 shadow-sm dark:bg-slate-700 dark:text-brand-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-400",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
