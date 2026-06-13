// Global dashboard filters — period / brand / store / comparison basis.
// Period & data filters live in the URL (so server components can read them);
// pure UI prefs (theme, sidebar) live client-side.

export const TODAY = "2026-06-13";
export const CURRENT_YM = "2026-06";

export type PeriodKey =
  | "thisMonth"
  | "lastMonth"
  | "last3m"
  | "last6m"
  | "last12m"
  | "thisFY";

export type CompareKey = "prevYear" | "prevPeriod";

export interface Filters {
  period: PeriodKey;
  brandId: string; // "all" | brand id
  storeId: string; // "all" | store id
  compare: CompareKey;
}

export const DEFAULT_FILTERS: Filters = {
  period: "thisMonth",
  brandId: "all",
  storeId: "all",
  compare: "prevYear",
};

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "thisMonth", label: "今月" },
  { key: "lastMonth", label: "先月" },
  { key: "last3m", label: "直近3ヶ月" },
  { key: "last6m", label: "直近6ヶ月" },
  { key: "last12m", label: "直近12ヶ月" },
  { key: "thisFY", label: "今期 (4月〜)" },
];

export const COMPARE_OPTIONS: { key: CompareKey; label: string }[] = [
  { key: "prevYear", label: "前年同期比" },
  { key: "prevPeriod", label: "前期間比" },
];

export function periodLabel(key: PeriodKey): string {
  return PERIOD_OPTIONS.find((p) => p.key === key)?.label ?? key;
}

// ---- YM helpers ----------------------------------------------------------

/** Add `months` (can be negative) to a "YYYY-MM" string. */
export function shiftYm(ym: string, months: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Inclusive list of YMs between two months. */
export function ymRange(startYm: string, endYm: string): string[] {
  const out: string[] = [];
  let cur = startYm;
  for (let i = 0; i < 60 && cur <= endYm; i++) {
    out.push(cur);
    cur = shiftYm(cur, 1);
  }
  return out;
}

/** Number of months a period spans, anchored at CURRENT_YM. */
export function periodMonths(key: PeriodKey): string[] {
  switch (key) {
    case "thisMonth":
      return [CURRENT_YM];
    case "lastMonth":
      return [shiftYm(CURRENT_YM, -1)];
    case "last3m":
      return ymRange(shiftYm(CURRENT_YM, -2), CURRENT_YM);
    case "last6m":
      return ymRange(shiftYm(CURRENT_YM, -5), CURRENT_YM);
    case "last12m":
      return ymRange(shiftYm(CURRENT_YM, -11), CURRENT_YM);
    case "thisFY": {
      // Japanese FY starts in April.
      const [y, m] = CURRENT_YM.split("-").map(Number);
      const fyStartYear = m >= 4 ? y : y - 1;
      return ymRange(`${fyStartYear}-04`, CURRENT_YM);
    }
  }
}

/** Months for the comparison window, aligned with the current period. */
export function comparisonMonths(filters: Filters): string[] {
  const cur = periodMonths(filters.period);
  const offset = filters.compare === "prevYear" ? -12 : -cur.length;
  return cur.map((ym) => shiftYm(ym, offset));
}

export function isSingleMonth(key: PeriodKey): boolean {
  return key === "thisMonth" || key === "lastMonth";
}

// ---- URL (de)serialisation ----------------------------------------------

export function parseFilters(
  sp: Record<string, string | string[] | undefined>,
): Filters {
  const get = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const period = (get("period") as PeriodKey) || DEFAULT_FILTERS.period;
  const validPeriod = PERIOD_OPTIONS.some((p) => p.key === period)
    ? period
    : DEFAULT_FILTERS.period;
  const compare = (get("compare") as CompareKey) || DEFAULT_FILTERS.compare;
  return {
    period: validPeriod,
    brandId: get("brand") || "all",
    storeId: get("store") || "all",
    compare: COMPARE_OPTIONS.some((c) => c.key === compare)
      ? compare
      : DEFAULT_FILTERS.compare,
  };
}

export function buildQuery(f: Partial<Filters>): string {
  const sp = new URLSearchParams();
  if (f.period && f.period !== DEFAULT_FILTERS.period) sp.set("period", f.period);
  if (f.brandId && f.brandId !== "all") sp.set("brand", f.brandId);
  if (f.storeId && f.storeId !== "all") sp.set("store", f.storeId);
  if (f.compare && f.compare !== DEFAULT_FILTERS.compare)
    sp.set("compare", f.compare);
  const s = sp.toString();
  return s ? `?${s}` : "";
}
