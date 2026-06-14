// Budget / target model — intentionally generic so it can be configured for
// different companies and business genres (salon categories). Defaults are
// derived from prior-period actuals × a genre growth assumption, and every
// assumption is editable in the UI (persisted client-side).

import type { SalonCategory } from "@/lib/types";

export type ScenarioKey = "conservative" | "standard" | "aggressive";

export const SCENARIOS: { key: ScenarioKey; label: string; offset: number; desc: string }[] = [
  { key: "conservative", label: "保守", offset: -0.03, desc: "堅実・据え置き寄り" },
  { key: "standard", label: "標準", offset: 0, desc: "業界水準の成長" },
  { key: "aggressive", label: "積極", offset: 0.04, desc: "拡大・投資フェーズ" },
];

/** Base YoY growth target per genre (standard scenario). */
export const GENRE_BASE_GROWTH: Record<SalonCategory, number> = {
  hair: 0.06,
  nail: 0.08,
  eyelash: 0.1,
  relax: 0.05,
  osteopathy: 0.05,
  esthetic: 0.12,
};

export function presetGrowth(scenario: ScenarioKey): Record<SalonCategory, number> {
  const off = SCENARIOS.find((s) => s.key === scenario)?.offset ?? 0;
  const out = {} as Record<SalonCategory, number>;
  (Object.keys(GENRE_BASE_GROWTH) as SalonCategory[]).forEach((c) => {
    out[c] = Math.max(0, Math.round((GENRE_BASE_GROWTH[c] + off) * 1000) / 1000);
  });
  return out;
}

export const BUDGET_METRICS = [
  { key: "revenue", label: "売上高", kind: "yen" },
  { key: "profit", label: "営業利益", kind: "yen" },
  { key: "customers", label: "来店客数", kind: "count" },
  { key: "newCustomers", label: "新規客数", kind: "count" },
] as const;

export type BudgetMetricKey = (typeof BUDGET_METRICS)[number]["key"];

/** Target for a metric from a baseline value and growth rate. */
export function targetFor(metric: BudgetMetricKey, baseline: number, growth: number): number {
  // For profit, a loss-making baseline targets break-even rather than a deeper loss.
  if (metric === "profit") return baseline > 0 ? baseline * (1 + growth) : 0;
  return baseline * (1 + growth);
}

export function achievement(actual: number, target: number): number {
  if (target <= 0) return actual >= target ? 1 : 0;
  return actual / target;
}

/** Pace status from forecast achievement (projected landing vs target). */
export function paceStatus(forecastAchievement: number): {
  label: string;
  tone: "success" | "warning" | "danger";
} {
  if (forecastAchievement >= 1) return { label: "達成見込", tone: "success" };
  if (forecastAchievement >= 0.95) return { label: "ほぼ達成", tone: "warning" };
  return { label: "未達見込", tone: "danger" };
}

export const BUDGET_STORAGE_KEY = "salonone-budget-v1";
