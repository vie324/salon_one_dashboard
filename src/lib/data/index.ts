// ============================================================
// Data-access layer — the single integration seam.
// ------------------------------------------------------------
// Pages (server components) and /api routes call these selectors. Today they
// aggregate the mock dataset in ./generate. To go live against Salon One,
// reimplement each selector to fetch + map the real API while keeping the
// return shapes identical, and every screen keeps working unchanged.
// ============================================================

import {
  CURRENT_YM,
  TODAY,
  comparisonMonths,
  periodMonths,
  shiftYm,
  ymRange,
  type Filters,
} from "@/lib/filters";
import {
  BRANDS,
  CATEGORY_PROFILE,
  CHANNELS,
  PAYMENT_MIX,
  PROCESSORS,
  STORES,
  brandById,
  processorById,
  storeById,
} from "./catalog";
import {
  CHANNEL_MONTHS,
  INVENTORY,
  PREPAID_MONTHS,
  RECON_ITEMS,
  SETTLEMENTS,
  STORE_DAILY,
  STORE_MONTHS,
  SUBSCRIPTION_MONTHS,
  STAFF_PERF,
  opexOf,
  revenueOf,
} from "./generate";
import { randFloat, rngFor } from "./random";
import {
  CATEGORY_LABEL,
  PAYMENT_LABEL,
  type PaymentMethodKey,
  type StoreMonth,
} from "@/lib/types";

// ---- low-level helpers ----------------------------------------------------

export function filteredStores(f: Filters) {
  return STORES.filter(
    (s) =>
      (f.brandId === "all" || s.brandId === f.brandId) &&
      (f.storeId === "all" || s.id === f.storeId),
  );
}

function selectMonths(yms: string[], f: Filters): StoreMonth[] {
  const set = new Set(yms);
  return STORE_MONTHS.filter(
    (m) =>
      set.has(m.ym) &&
      (f.brandId === "all" || m.brandId === f.brandId) &&
      (f.storeId === "all" || m.storeId === f.storeId),
  );
}

interface Agg {
  revenue: number;
  tech: number;
  product: number;
  subscription: number;
  other: number;
  customers: number;
  newCustomers: number;
  reservations: number;
  cancellations: number;
  noShows: number;
  cogs: number;
  cost: StoreMonth["cost"];
  opex: number;
  grossProfit: number;
  operatingProfit: number;
}

function emptyCost(): StoreMonth["cost"] {
  return { labor: 0, rent: 0, utilities: 0, advertising: 0, paymentFees: 0, depreciation: 0, other: 0 };
}

function aggregate(rows: StoreMonth[]): Agg {
  const a: Agg = {
    revenue: 0, tech: 0, product: 0, subscription: 0, other: 0,
    customers: 0, newCustomers: 0, reservations: 0, cancellations: 0, noShows: 0,
    cogs: 0, cost: emptyCost(), opex: 0, grossProfit: 0, operatingProfit: 0,
  };
  for (const m of rows) {
    a.tech += m.revenueTech;
    a.product += m.revenueProduct;
    a.subscription += m.revenueSubscription;
    a.other += m.revenueOther;
    a.customers += m.customers;
    a.newCustomers += m.newCustomers;
    a.reservations += m.reservations;
    a.cancellations += m.cancellations;
    a.noShows += m.noShows;
    a.cogs += m.cogs;
    a.cost.labor += m.cost.labor;
    a.cost.rent += m.cost.rent;
    a.cost.utilities += m.cost.utilities;
    a.cost.advertising += m.cost.advertising;
    a.cost.paymentFees += m.cost.paymentFees;
    a.cost.depreciation += m.cost.depreciation;
    a.cost.other += m.cost.other;
  }
  a.revenue = a.tech + a.product + a.subscription + a.other;
  a.opex = a.cost.labor + a.cost.rent + a.cost.utilities + a.cost.advertising + a.cost.paymentFees + a.cost.depreciation + a.cost.other;
  a.grossProfit = a.revenue - a.cogs;
  a.operatingProfit = a.grossProfit - a.opex;
  return a;
}

function safeDelta(cur: number, prev: number): number {
  if (!prev) return 0;
  return (cur - prev) / prev;
}

function capacityFor(f: Filters, monthCount: number): number {
  const seats = filteredStores(f).reduce((s, st) => s + st.seats, 0);
  return seats * 26 * 5 * monthCount; // seats × open days × slots
}

/** Per-month aggregate for a list of YMs (for sparklines / trends). */
function monthlyAggs(yms: string[], f: Filters): { ym: string; agg: Agg }[] {
  return yms.map((ym) => ({ ym, agg: aggregate(selectMonths([ym], f)) }));
}

function trailing12(f: Filters) {
  return ymRange(shiftYm(CURRENT_YM, -11), CURRENT_YM);
}

// payment-method split for a set of months
function paymentSplit(rows: StoreMonth[]): { method: PaymentMethodKey; label: string; amount: number }[] {
  const totals: Record<string, number> = {};
  for (const m of rows) {
    const brand = brandById(m.brandId)!;
    const rev = revenueOf(m);
    for (const method of Object.keys(PAYMENT_MIX[brand.category]) as PaymentMethodKey[]) {
      totals[method] = (totals[method] ?? 0) + rev * PAYMENT_MIX[brand.category][method];
    }
  }
  return (Object.keys(totals) as PaymentMethodKey[]).map((method) => ({
    method,
    label: PAYMENT_LABEL[method],
    amount: totals[method],
  }));
}

// ============================================================
// Catalog (for filter bar etc.)
// ============================================================

export function getCatalog() {
  return {
    company: { ym: CURRENT_YM, today: TODAY },
    brands: BRANDS,
    stores: STORES.map((s) => ({ ...s, brandName: brandById(s.brandId)!.name })),
  };
}

// ============================================================
// Overview
// ============================================================

export function getOverview(f: Filters) {
  const cur = periodMonths(f);
  const prev = comparisonMonths(f);
  const a = aggregate(selectMonths(cur, f));
  const p = aggregate(selectMonths(prev, f));
  const months = cur.length;

  const t12 = trailing12(f);
  const spark = monthlyAggs(t12, f);
  const sparkRevenue = spark.map((s) => s.agg.revenue);

  const occupancy = Math.min(0.97, a.customers / capacityFor(f, months));
  const prevOcc = Math.min(0.97, p.customers / capacityFor(f, months));

  const kpis = [
    { key: "revenue", label: "売上高", value: a.revenue, delta: safeDelta(a.revenue, p.revenue), format: "yenCompact" as const, spark: sparkRevenue, hint: "技術＋店販＋サブスク＋その他" },
    { key: "operatingProfit", label: "営業利益", value: a.operatingProfit, delta: safeDelta(a.operatingProfit, p.operatingProfit), format: "yenCompact" as const, spark: spark.map((s) => s.agg.operatingProfit), hint: `営業利益率 ${((a.operatingProfit / a.revenue) * 100).toFixed(1)}%` },
    { key: "customers", label: "来店客数", value: a.customers, delta: safeDelta(a.customers, p.customers), format: "number" as const, spark: spark.map((s) => s.agg.customers) },
    { key: "ticket", label: "客単価", value: a.revenue / a.customers, delta: safeDelta(a.revenue / a.customers, p.revenue / p.customers), format: "yen" as const, spark: spark.map((s) => s.agg.revenue / Math.max(1, s.agg.customers)) },
    { key: "repeat", label: "リピート率", value: (a.customers - a.newCustomers) / a.customers, delta: safeDelta((a.customers - a.newCustomers) / a.customers, (p.customers - p.newCustomers) / p.customers), format: "percent" as const, spark: spark.map((s) => (s.agg.customers - s.agg.newCustomers) / Math.max(1, s.agg.customers)) },
    { key: "occupancy", label: "予約稼働率", value: occupancy, delta: safeDelta(occupancy, prevOcc), format: "percent" as const, spark: spark.map((s) => Math.min(0.97, s.agg.customers / capacityFor(f, 1))) },
    { key: "cancel", label: "キャンセル率", value: a.cancellations / a.reservations, delta: safeDelta(a.cancellations / a.reservations, p.cancellations / p.reservations), format: "percent" as const, spark: spark.map((s) => s.agg.cancellations / Math.max(1, s.agg.reservations)), hint: "無断含む" },
    { key: "newCustomers", label: "新規客数", value: a.newCustomers, delta: safeDelta(a.newCustomers, p.newCustomers), format: "number" as const, spark: spark.map((s) => s.agg.newCustomers) },
  ];

  // brand breakdown
  const brandRows = (f.brandId === "all" ? BRANDS : BRANDS.filter((b) => b.id === f.brandId)).map((b) => {
    const rows = selectMonths(cur, { ...f, brandId: b.id, storeId: "all" });
    const ba = aggregate(rows);
    return { id: b.id, name: b.name, color: b.color, category: CATEGORY_LABEL[b.category], revenue: ba.revenue, operatingProfit: ba.operatingProfit, margin: ba.revenue ? ba.operatingProfit / ba.revenue : 0 };
  }).sort((x, y) => y.revenue - x.revenue);

  // store ranking by revenue with MoM growth
  const storeRows = filteredStores(f).map((s) => {
    const sa = aggregate(selectMonths(cur, { ...f, storeId: s.id }));
    const sp = aggregate(selectMonths(prev, { ...f, storeId: s.id }));
    return { id: s.id, name: s.name, brandColor: brandById(s.brandId)!.color, revenue: sa.revenue, operatingProfit: sa.operatingProfit, margin: sa.revenue ? sa.operatingProfit / sa.revenue : 0, growth: safeDelta(sa.revenue, sp.revenue) };
  });
  const topStores = [...storeRows].sort((x, y) => y.revenue - x.revenue).slice(0, 6);

  // alerts
  const alerts = buildAlerts(f, storeRows);

  // trend
  const trend = getTrend(f);

  // today snapshot
  const todayRows = STORE_DAILY.filter((d) => d.date === TODAY && filteredStores(f).some((s) => s.id === d.storeId));
  const todayRevenue = todayRows.reduce((s, d) => s + d.revenue, 0);
  const todayCustomers = todayRows.reduce((s, d) => s + d.customers, 0);

  return {
    period: { months, label: cur.length === 1 ? cur[0] : `${cur[0]} 〜 ${cur[cur.length - 1]}` },
    kpis,
    brandRows,
    topStores,
    alerts,
    trend,
    paymentMix: paymentSplit(selectMonths(cur, f)).sort((x, y) => y.amount - x.amount),
    today: { date: TODAY, revenue: todayRevenue, customers: todayCustomers, reservations: Math.round(todayCustomers * 1.12) },
    summary: { revenue: a.revenue, grossProfit: a.grossProfit, operatingProfit: a.operatingProfit, operatingMargin: a.revenue ? a.operatingProfit / a.revenue : 0 },
  };
}

export interface AlertItem {
  level: "danger" | "warning" | "info";
  title: string;
  detail: string;
  href: string;
}

function buildAlerts(f: Filters, storeRows: { id: string; name: string; revenue: number; operatingProfit: number; growth: number }[]): AlertItem[] {
  const alerts: AlertItem[] = [];
  // sharp revenue drop
  for (const s of storeRows) {
    if (s.growth < -0.12) {
      alerts.push({ level: "danger", title: `${storeById(s.id)?.name ?? s.name} の売上が急減`, detail: `前${f.compare === "prevYear" ? "年同月" : "期間"}比 ${(s.growth * 100).toFixed(1)}%。要因分析が必要です。`, href: "/sales" });
    }
  }
  // negative operating profit
  const loss = storeRows.filter((s) => s.operatingProfit < 0);
  if (loss.length) {
    alerts.push({ level: "warning", title: `営業赤字の店舗が ${loss.length} 件`, detail: loss.map((s) => storeById(s.id)?.name).filter(Boolean).join("、"), href: "/financials" });
  }
  // reconciliation
  const unmatched = RECON_ITEMS.filter((r) => r.status === "unmatched");
  if (unmatched.length) {
    const diff = unmatched.reduce((s, r) => s + Math.abs(r.recorded - r.settled), 0);
    alerts.push({ level: "danger", title: `入金突合の未解決 ${unmatched.length} 件`, detail: `差異合計 ¥${Math.round(diff).toLocaleString("ja-JP")}。早期確認を推奨します。`, href: "/reconciliation" });
  }
  // delayed settlement
  const delayed = SETTLEMENTS.filter((s) => s.status === "delayed");
  if (delayed.length) {
    const amt = delayed.reduce((s, x) => s + x.net, 0);
    alerts.push({ level: "warning", title: `入金遅延 ${delayed.length} 件`, detail: `${processorById(delayed[0].processorId)?.name} ほか。未入金 ¥${Math.round(amt).toLocaleString("ja-JP")}。`, href: "/cashflow" });
  }
  // prepaid liability watch
  const prepaid = PREPAID_MONTHS[PREPAID_MONTHS.length - 1];
  alerts.push({ level: "info", title: "前受金（役務）残高の管理", detail: `期末残高 ¥${Math.round(prepaid.balance).toLocaleString("ja-JP")}。負債計上・消化管理の対象です。`, href: "/customers" });
  return alerts.slice(0, 6);
}

/** Global, unfiltered alert feed for the notification centre. */
export function getAlerts(): AlertItem[] {
  const f: Filters = { period: "thisMonth", brandId: "all", storeId: "all", compare: "prevYear" };
  const cur = periodMonths(f);
  const prev = comparisonMonths(f);
  const storeRows = STORES.map((s) => {
    const sa = aggregate(selectMonths(cur, { ...f, storeId: s.id }));
    const sp = aggregate(selectMonths(prev, { ...f, storeId: s.id }));
    return { id: s.id, name: s.name, revenue: sa.revenue, operatingProfit: sa.operatingProfit, growth: safeDelta(sa.revenue, sp.revenue) };
  });
  return buildAlerts(f, storeRows);
}

function getTrend(f: Filters) {
  if (f.period === "thisMonth") {
    const stores = new Set(filteredStores(f).map((s) => s.id));
    const byDate: Record<string, { revenue: number; isFuture: boolean }> = {};
    for (const d of STORE_DAILY) {
      if (!stores.has(d.storeId)) continue;
      const e = (byDate[d.date] ??= { revenue: 0, isFuture: d.isFuture });
      e.revenue += d.revenue;
    }
    const points = Object.keys(byDate).sort().map((date) => ({ label: date, value: Math.round(byDate[date].revenue), forecast: byDate[date].isFuture ? Math.round(byDate[date].revenue) : null, actual: byDate[date].isFuture ? null : Math.round(byDate[date].revenue) }));
    return { granularity: "daily" as const, points };
  }
  const yms = f.period === "lastMonth" ? ymRange(shiftYm(CURRENT_YM, -6), shiftYm(CURRENT_YM, -1)) : periodMonths(f);
  const points = monthlyAggs(yms, f).map(({ ym, agg }) => ({
    label: ym,
    value: Math.round(agg.revenue),
    profit: Math.round(agg.operatingProfit),
    prev: Math.round(aggregate(selectMonths([shiftYm(ym, -12)], f)).revenue),
  }));
  return { granularity: "monthly" as const, points };
}

// ============================================================
// Sales & performance
// ============================================================

export function getSales(f: Filters) {
  const cur = periodMonths(f);
  const prev = comparisonMonths(f);
  const a = aggregate(selectMonths(cur, f));
  const p = aggregate(selectMonths(prev, f));

  // menu mix (with gross margin) — derive from brand categories in scope
  const menuTotals: Record<string, number> = {};
  const menuCost: Record<string, number> = {};
  for (const m of selectMonths(cur, f)) {
    const brand = brandById(m.brandId)!;
    const groups = MENU_WEIGHTS[brand.category] ?? [];
    const techPlusProduct = m.revenueTech + m.revenueProduct;
    const cogs = CATEGORY_PROFILE[brand.category].cogsRatio;
    for (const g of groups) {
      const amt = techPlusProduct * g.weight;
      menuTotals[g.label] = (menuTotals[g.label] ?? 0) + amt;
      menuCost[g.label] = (menuCost[g.label] ?? 0) + amt * cogs;
    }
  }
  const menuMix = Object.entries(menuTotals)
    .map(([label, amount]) => ({ label, amount, grossProfit: amount - (menuCost[label] ?? 0), marginRate: amount ? 1 - (menuCost[label] ?? 0) / amount : 0 }))
    .sort((x, y) => y.amount - x.amount)
    .slice(0, 8);

  // staff ranking
  const staff = STAFF_PERF.filter((s) => (f.brandId === "all" || s.brandId === f.brandId) && (f.storeId === "all" || s.storeId === f.storeId))
    .map((s) => ({ ...s, storeName: storeById(s.storeId)!.name, brandColor: brandById(s.brandId)!.color, designationRate: s.customers ? s.designations / s.customers : 0 }))
    .sort((x, y) => y.sales - x.sales).slice(0, 12);

  // heatmap weekday × hour
  const heatmap = buildHeatmap(f);

  // new vs repeat trend (trailing 12)
  const t12 = trailing12(f);
  const nrTrend = monthlyAggs(t12, f).map(({ ym, agg }) => ({ label: ym, new: agg.newCustomers, repeat: agg.customers - agg.newCustomers }));

  // brand comparison
  const brandRows = (f.brandId === "all" ? BRANDS : BRANDS.filter((b) => b.id === f.brandId)).map((b) => {
    const ba = aggregate(selectMonths(cur, { ...f, brandId: b.id, storeId: "all" }));
    const bp = aggregate(selectMonths(prev, { ...f, brandId: b.id, storeId: "all" }));
    return { id: b.id, name: b.name, color: b.color, category: CATEGORY_LABEL[b.category], revenue: ba.revenue, ticket: ba.customers ? ba.revenue / ba.customers : 0, customers: ba.customers, growth: safeDelta(ba.revenue, bp.revenue) };
  }).sort((x, y) => y.revenue - x.revenue);

  return {
    headline: {
      revenue: a.revenue, revenueDelta: safeDelta(a.revenue, p.revenue),
      ticket: a.revenue / a.customers, ticketDelta: safeDelta(a.revenue / a.customers, p.revenue / p.customers),
      customers: a.customers, customersDelta: safeDelta(a.customers, p.customers),
      repeatRate: (a.customers - a.newCustomers) / a.customers,
      techShare: a.tech / a.revenue, productShare: a.product / a.revenue,
    },
    menuMix, staff, heatmap, nrTrend, brandRows,
  };
}

// local copy of menu group labels (kept here to avoid a circular import shape)
const MENU_GROUPS_LOCAL: Record<string, string[]> = {
  hair: ["カット", "カラー", "パーマ", "トリートメント", "ヘッドスパ", "店販"],
  nail: ["ジェルネイル", "ケア", "アート", "フットネイル", "店販"],
  eyelash: ["まつげエクステ", "ラッシュリフト", "アイブロウ", "店販"],
  relax: ["全身もみほぐし", "リフレ", "アロマ", "ストレッチ"],
  osteopathy: ["整体・矯正", "骨盤矯正", "鍼灸", "自費リハビリ"],
  esthetic: ["フェイシャル", "ボディ・痩身", "脱毛", "コース消化", "店販"],
};

const MENU_WEIGHTS: Record<string, { label: string; weight: number }[]> = (() => {
  const out: Record<string, { label: string; weight: number }[]> = {};
  const def: Record<string, number[]> = {
    hair: [0.34, 0.3, 0.08, 0.1, 0.06, 0.12],
    nail: [0.52, 0.14, 0.18, 0.12, 0.04],
    eyelash: [0.58, 0.22, 0.17, 0.03],
    relax: [0.46, 0.22, 0.2, 0.12],
    osteopathy: [0.44, 0.26, 0.18, 0.12],
    esthetic: [0.32, 0.3, 0.18, 0.1, 0.1],
  };
  for (const b of BRANDS) {
    const labels = MENU_GROUPS_LOCAL[b.category];
    const w = def[b.category];
    out[b.category] = labels.map((label, i) => ({ label, weight: w[i] ?? 0.05 }));
  }
  return out;
})();

function buildHeatmap(f: Filters) {
  const days = ["月", "火", "水", "木", "金", "土", "日"];
  const hours = Array.from({ length: 11 }, (_, i) => i + 10); // 10:00 - 20:00
  const matrix = days.map((d, di) =>
    hours.map((h, hi) => {
      // evenings + weekends busier
      const evening = h >= 17 ? 1.5 : h >= 13 ? 1.15 : 0.85;
      const weekend = di >= 4 ? 1.5 : di === 2 ? 0.8 : 1;
      const base = evening * weekend;
      const wobble = ((di * 31 + hi * 17) % 13) / 30; // deterministic
      return Math.round((base + wobble) * 40);
    }),
  );
  return { days, hours, matrix };
}

// ============================================================
// Cashflow & settlements
// ============================================================

export function getCashflow(f: Filters) {
  const cur = periodMonths(f);
  const a = aggregate(selectMonths(cur, f));
  const split = paymentSplit(selectMonths(cur, f)).sort((x, y) => y.amount - x.amount);

  // settlement schedule (current month, company-level)
  const settlements = SETTLEMENTS.map((s) => ({
    ...s,
    processorName: processorById(s.processorId)!.name,
    methodLabel: PAYMENT_LABEL[s.method],
  })).sort((x, y) => x.date.localeCompare(y.date));

  const scheduled = settlements.filter((s) => s.status === "scheduled");
  const paid = settlements.filter((s) => s.status === "paid");
  const delayed = settlements.filter((s) => s.status === "delayed");

  // processor breakdown (current month)
  const byProcessor = PROCESSORS.filter((p) => p.method !== "cash" && p.method !== "prepaid").map((p) => {
    const methodAmt = split.find((s) => s.method === p.method)?.amount ?? 0;
    const fee = methodAmt * p.feeRate;
    return { id: p.id, name: p.name, method: PAYMENT_LABEL[p.method], cycle: p.cycleLabel, feeRate: p.feeRate, gross: methodAmt, fee, net: methodAmt - fee };
  }).filter((p) => p.gross > 0).sort((x, y) => y.gross - x.gross);

  // cash position (illustrative): cash sales accumulate in register
  const cashSales = split.find((s) => s.method === "cash")?.amount ?? 0;

  // cashflow trend (trailing 12): inflow vs outflow(opex+cogs)
  const t12 = trailing12(f);
  const cfTrend = monthlyAggs(t12, f).map(({ ym, agg }) => ({ label: ym, inflow: Math.round(agg.revenue), outflow: Math.round(agg.cogs + agg.opex), net: Math.round(agg.revenue - agg.cogs - agg.opex) }));

  // cash balance forecast: running balance + 6-month projection
  const openingCash = 28_000_000;
  let bal = openingCash;
  const histBal = monthlyAggs(t12, f).map(({ ym, agg }) => {
    bal += agg.revenue - agg.cogs - agg.opex;
    return { ym, bal };
  });
  const recentNet = cfTrend.slice(-3).reduce((s, p) => s + p.net, 0) / 3;
  const last6 = histBal.slice(-6);
  const cashForecast: { label: string; actual: number | null; forecast: number | null }[] = last6.map((h, i) => ({
    label: h.ym,
    actual: Math.round(h.bal),
    forecast: i === last6.length - 1 ? Math.round(h.bal) : null,
  }));
  let proj = histBal[histBal.length - 1].bal;
  for (let i = 1; i <= 6; i++) {
    proj += recentNet;
    cashForecast.push({ label: shiftYm(CURRENT_YM, i), actual: null, forecast: Math.round(proj) });
  }

  // prepaid liability + subscription mrr (latest)
  const prepaid = PREPAID_MONTHS[PREPAID_MONTHS.length - 1];
  const prepaidTrend = PREPAID_MONTHS.slice(-12).map((p) => ({ label: p.ym, balance: Math.round(p.balance), sold: Math.round(p.sold), consumed: Math.round(p.consumed) }));
  const sub = SUBSCRIPTION_MONTHS[SUBSCRIPTION_MONTHS.length - 1];

  const totalScheduledNet = scheduled.reduce((s, x) => s + x.net, 0);
  const totalDelayedNet = delayed.reduce((s, x) => s + x.net, 0);
  const totalFees = byProcessor.reduce((s, x) => s + x.fee, 0);

  return {
    headline: {
      cashSales,
      depositScheduled: totalScheduledNet,
      depositDelayed: totalDelayedNet,
      feesTotal: totalFees,
      net: a.revenue - a.cogs - a.opex,
    },
    split,
    settlements, scheduled, paid, delayed,
    byProcessor,
    cfTrend,
    cashForecast,
    prepaid: { balance: prepaid.balance, sold: prepaid.sold, consumed: prepaid.consumed, trend: prepaidTrend },
    subscription: { members: sub.members, mrr: sub.mrr, churn: sub.churnedMembers, newMembers: sub.newMembers },
  };
}

// ============================================================
// Reconciliation
// ============================================================

export function getReconciliation(f: Filters) {
  const rows = RECON_ITEMS.filter((r) => (f.brandId === "all" || storeById(r.storeId)?.brandId === f.brandId) && (f.storeId === "all" || r.storeId === f.storeId))
    .map((r) => ({ ...r, storeName: storeById(r.storeId)!.name, processorName: processorById(r.processorId)!.name, methodLabel: PAYMENT_LABEL[r.method], diff: r.settled - r.recorded }))
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff));

  const summary = {
    matched: rows.filter((r) => r.status === "matched").length,
    investigating: rows.filter((r) => r.status === "investigating").length,
    unmatched: rows.filter((r) => r.status === "unmatched").length,
    recorded: rows.reduce((s, r) => s + r.recorded, 0),
    settled: rows.reduce((s, r) => s + r.settled, 0),
    diffTotal: rows.reduce((s, r) => s + r.diff, 0),
    diffAbs: rows.reduce((s, r) => s + Math.abs(r.diff), 0),
  };

  // by method
  const byMethod = (Object.keys(PAYMENT_LABEL) as PaymentMethodKey[]).map((m) => {
    const mr = rows.filter((r) => r.method === m);
    return { method: m, label: PAYMENT_LABEL[m], count: mr.length, recorded: mr.reduce((s, r) => s + r.recorded, 0), settled: mr.reduce((s, r) => s + r.settled, 0), diff: mr.reduce((s, r) => s + r.diff, 0) };
  }).filter((m) => m.count > 0);

  return { rows, summary, byMethod };
}

// ============================================================
// Financials / P&L
// ============================================================

export function getFinancials(f: Filters) {
  const cur = periodMonths(f);
  const prev = comparisonMonths(f);
  const a = aggregate(selectMonths(cur, f));
  const p = aggregate(selectMonths(prev, f));

  const pl = buildPL(a, p);

  // by brand
  const byBrand = (f.brandId === "all" ? BRANDS : BRANDS.filter((b) => b.id === f.brandId)).map((b) => {
    const ba = aggregate(selectMonths(cur, { ...f, brandId: b.id, storeId: "all" }));
    return { id: b.id, name: b.name, color: b.color, revenue: ba.revenue, grossProfit: ba.grossProfit, operatingProfit: ba.operatingProfit, margin: ba.revenue ? ba.operatingProfit / ba.revenue : 0 };
  }).sort((x, y) => y.operatingProfit - x.operatingProfit);

  // by store
  const byStore = filteredStores(f).map((s) => {
    const sa = aggregate(selectMonths(cur, { ...f, storeId: s.id }));
    return { id: s.id, name: s.name, brandColor: brandById(s.brandId)!.color, revenue: sa.revenue, operatingProfit: sa.operatingProfit, margin: sa.revenue ? sa.operatingProfit / sa.revenue : 0 };
  }).sort((x, y) => y.operatingProfit - x.operatingProfit);

  // profit trend (trailing 12)
  const t12 = trailing12(f);
  const trend = monthlyAggs(t12, f).map(({ ym, agg }) => ({ label: ym, revenue: Math.round(agg.revenue), grossProfit: Math.round(agg.grossProfit), operatingProfit: Math.round(agg.operatingProfit) }));

  // breakeven (approximate fixed/variable split)
  const fixed = a.cost.rent + a.cost.depreciation + a.cost.labor * 0.7 + a.cost.utilities;
  const variable = a.cogs + a.cost.paymentFees + a.cost.advertising * 0.5 + a.cost.labor * 0.3 + a.cost.other;
  const variableRatio = a.revenue ? variable / a.revenue : 0;
  const breakevenRevenue = variableRatio < 1 ? fixed / (1 - variableRatio) : 0;

  // labour productivity (付加価値 ≈ 売上総利益)
  const productivity = {
    laborShare: a.grossProfit ? a.cost.labor / a.grossProfit : 0, // 労働分配率
    laborCostRatio: a.revenue ? a.cost.labor / a.revenue : 0, // 人件費率
    valueAddedPerStaff: a.grossProfit / Math.max(1, filteredStores(f).reduce((s, st) => s + st.staff, 0)),
  };

  return {
    pl, byBrand, byStore, trend, productivity,
    breakeven: { revenue: a.revenue, breakevenRevenue, fixed, variableRatio, marginOfSafety: a.revenue ? (a.revenue - breakevenRevenue) / a.revenue : 0 },
    period: { months: cur.length, label: cur.length === 1 ? cur[0] : `${cur[0]} 〜 ${cur[cur.length - 1]}`, compareLabel: prev.length === 1 ? prev[0] : `${prev[0]} 〜 ${prev[prev.length - 1]}` },
  };
}

export interface PLLine {
  key: string;
  label: string;
  amount: number;
  prev: number;
  ratio: number; // of revenue
  delta: number;
  kind: "revenue" | "cogs" | "subtotal" | "opex" | "result";
  indent?: boolean;
}

function buildPL(a: Agg, p: Agg): PLLine[] {
  const rev = a.revenue;
  const L = (key: string, label: string, amount: number, prev: number, kind: PLLine["kind"], indent = false): PLLine => ({ key, label, amount, prev, ratio: rev ? amount / rev : 0, delta: safeDelta(amount, prev), kind, indent });
  return [
    L("rev_tech", "技術売上", a.tech, p.tech, "revenue", true),
    L("rev_product", "店販売上", a.product, p.product, "revenue", true),
    L("rev_sub", "サブスク売上", a.subscription, p.subscription, "revenue", true),
    L("rev_other", "その他売上", a.other, p.other, "revenue", true),
    L("rev_total", "売上高", a.revenue, p.revenue, "subtotal"),
    L("cogs", "売上原価（材料費）", a.cogs, p.cogs, "cogs"),
    L("gross", "売上総利益", a.grossProfit, p.grossProfit, "subtotal"),
    L("labor", "人件費", a.cost.labor, p.cost.labor, "opex", true),
    L("rent", "地代家賃", a.cost.rent, p.cost.rent, "opex", true),
    L("utilities", "水道光熱費", a.cost.utilities, p.cost.utilities, "opex", true),
    L("advertising", "広告宣伝費", a.cost.advertising, p.cost.advertising, "opex", true),
    L("fees", "支払手数料", a.cost.paymentFees, p.cost.paymentFees, "opex", true),
    L("depreciation", "減価償却費", a.cost.depreciation, p.cost.depreciation, "opex", true),
    L("other", "その他経費", a.cost.other, p.cost.other, "opex", true),
    L("opex_total", "販売費及び一般管理費", a.opex, p.opex, "subtotal"),
    L("operating", "営業利益", a.operatingProfit, p.operatingProfit, "result"),
  ];
}

// ============================================================
// Stores
// ============================================================

export function getStores(f: Filters) {
  const cur = periodMonths(f);
  const prev = comparisonMonths(f);
  const rows = filteredStores(f).map((s) => {
    const sa = aggregate(selectMonths(cur, { ...f, storeId: s.id }));
    const sp = aggregate(selectMonths(prev, { ...f, storeId: s.id }));
    const brand = brandById(s.brandId)!;
    return {
      id: s.id, name: s.name, brandId: s.brandId, brandName: brand.name, brandColor: brand.color,
      category: CATEGORY_LABEL[brand.category], area: s.area, prefecture: s.prefecture, status: s.status,
      staff: s.staff, seats: s.seats, manager: s.manager,
      revenue: sa.revenue, operatingProfit: sa.operatingProfit, margin: sa.revenue ? sa.operatingProfit / sa.revenue : 0,
      customers: sa.customers, ticket: sa.customers ? sa.revenue / sa.customers : 0,
      growth: safeDelta(sa.revenue, sp.revenue),
      revenuePerStaff: sa.revenue / Math.max(1, s.staff),
    };
  }).sort((x, y) => y.revenue - x.revenue);

  const totals = {
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
    operatingProfit: rows.reduce((s, r) => s + r.operatingProfit, 0),
    stores: rows.length,
    staff: rows.reduce((s, r) => s + r.staff, 0),
  };
  return { rows, totals };
}

export function getStoreDetail(storeId: string, f: Filters) {
  const s = storeById(storeId);
  if (!s) return null;
  const sf = { ...f, brandId: "all", storeId };
  const cur = periodMonths(sf);
  const prev = comparisonMonths(sf);
  const a = aggregate(selectMonths(cur, sf));
  const p = aggregate(selectMonths(prev, sf));
  const t12 = trailing12(sf);
  const trend = monthlyAggs(t12, sf).map(({ ym, agg }) => ({ label: ym, revenue: Math.round(agg.revenue), operatingProfit: Math.round(agg.operatingProfit) }));
  const staff = STAFF_PERF.filter((x) => x.storeId === storeId).map((x) => ({ ...x, designationRate: x.customers ? x.designations / x.customers : 0 })).sort((x, y) => y.sales - x.sales);
  const brand = brandById(s.brandId)!;

  // investment payback (出店・設備投資ROI)
  const monthlyProfit = a.operatingProfit / Math.max(1, cur.length);
  const initialInvestment = s.seats * 2_600_000; // 内装＋設備の概算
  const monthsOpen = (2026 - s.openedYear) * 12 + 6;
  const investment = {
    initialInvestment,
    monthlyProfit,
    paybackMonths: monthlyProfit > 0 ? initialInvestment / monthlyProfit : 0,
    annualRoi: initialInvestment ? (monthlyProfit * 12) / initialInvestment : 0,
    recoveryRate: initialInvestment ? Math.min(1.5, (monthsOpen * monthlyProfit) / initialInvestment) : 0,
    monthsOpen,
  };

  return {
    store: { ...s, brandName: brand.name, brandColor: brand.color, category: CATEGORY_LABEL[brand.category] },
    agg: a,
    deltas: { revenue: safeDelta(a.revenue, p.revenue), profit: safeDelta(a.operatingProfit, p.operatingProfit), customers: safeDelta(a.customers, p.customers) },
    pl: buildPL(a, p),
    trend, staff, investment,
    paymentMix: paymentSplit(selectMonths(cur, sf)).sort((x, y) => y.amount - x.amount),
  };
}

// ============================================================
// Labour productivity & staffing (人時生産性・シフト)
// ============================================================

export function getLabor(f: Filters) {
  const cur = periodMonths(f);
  const months = cur.length;
  const stores = filteredStores(f);
  const a = aggregate(selectMonths(cur, f));

  const rows = stores.map((s) => {
    const sa = aggregate(selectMonths(cur, { ...f, storeId: s.id }));
    const laborHours = s.staff * 160 * months;
    const productivity = laborHours ? sa.revenue / laborHours : 0;
    const recommendedStaff = Math.max(3, Math.round(sa.customers / months / 85));
    return {
      id: s.id,
      name: s.name,
      brandColor: brandById(s.brandId)!.color,
      staff: s.staff,
      productivity,
      laborShare: sa.grossProfit ? sa.cost.labor / sa.grossProfit : 0,
      laborCostRatio: sa.revenue ? sa.cost.labor / sa.revenue : 0,
      recommendedStaff,
      gap: s.staff - recommendedStaff,
    };
  }).sort((x, y) => y.productivity - x.productivity);

  const staffTotal = stores.reduce((s, st) => s + st.staff, 0);
  const totalHours = staffTotal * 160 * months;
  const commissionRate = 0.05;

  return {
    summary: {
      productivity: totalHours ? a.revenue / totalHours : 0,
      laborShare: a.grossProfit ? a.cost.labor / a.grossProfit : 0,
      laborCostRatio: a.revenue ? a.cost.labor / a.revenue : 0,
      commissionTotal: a.tech * commissionRate,
      laborCost: a.cost.labor,
      staffTotal,
    },
    rows,
    heatmap: buildHeatmap(f),
  };
}

// ============================================================
// Customers
// ============================================================

export function getCustomers(f: Filters) {
  const cur = periodMonths(f);
  const prev = comparisonMonths(f);
  const a = aggregate(selectMonths(cur, f));
  const p = aggregate(selectMonths(prev, f));

  const repeat = a.customers - a.newCustomers;
  const repeatRate = a.customers ? repeat / a.customers : 0;
  const churnRate = 1 - Math.min(0.95, repeatRate + 0.12);

  // LTV proxy: avg ticket × visits/yr × retention years
  const ticket = a.customers ? a.revenue / a.customers : 0;
  const ltv = ticket * 4.6 * (1 / Math.max(0.15, churnRate));

  // RFM buckets (deterministic illustrative split of active base)
  const active = Math.round(a.customers * 3.4); // active base larger than monthly visitors
  const rfm = [
    { label: "優良（VIP）", share: 0.12, color: "#0f766e" },
    { label: "ロイヤル", share: 0.2, color: "#14b8a6" },
    { label: "一般・安定", share: 0.34, color: "#0ea5e9" },
    { label: "離反兆候", share: 0.21, color: "#f59e0b" },
    { label: "休眠", share: 0.13, color: "#f43f5e" },
  ].map((r) => ({ ...r, count: Math.round(active * r.share) }));

  const t12 = trailing12(f);
  const trend = monthlyAggs(t12, f).map(({ ym, agg }) => ({ label: ym, new: agg.newCustomers, repeat: agg.customers - agg.newCustomers, repeatRate: agg.customers ? (agg.customers - agg.newCustomers) / agg.customers : 0 }));

  const prepaid = PREPAID_MONTHS[PREPAID_MONTHS.length - 1];
  const sub = SUBSCRIPTION_MONTHS[SUBSCRIPTION_MONTHS.length - 1];
  const subTrend = SUBSCRIPTION_MONTHS.slice(-12).map((s) => ({ label: s.ym, members: s.members, mrr: Math.round(s.mrr), churn: s.churnedMembers }));

  // cohort retention: last 6 acquisition months × months since acquisition
  const cohortMonths = ymRange(shiftYm(CURRENT_YM, -5), CURRENT_YM);
  const cohort = cohortMonths.map((ym, i) => {
    const size = aggregate(selectMonths([ym], f)).newCustomers;
    const maxOff = cohortMonths.length - 1 - i;
    const base = 0.74 + (Number(ym.split("-")[1]) % 6) / 60;
    const values: number[] = [];
    for (let o = 0; o <= maxOff; o++) values.push(o === 0 ? 1 : Math.max(0.18, Math.pow(base, o)));
    return { label: ym, size, values };
  });

  return {
    headline: {
      active, newCustomers: a.newCustomers, newDelta: safeDelta(a.newCustomers, p.newCustomers),
      repeatRate, churnRate, ltv,
    },
    rfm, trend,
    subscription: { members: sub.members, mrr: sub.mrr, churn: sub.churnedMembers, newMembers: sub.newMembers, trend: subTrend },
    prepaid: { balance: prepaid.balance, consumed: prepaid.consumed, sold: prepaid.sold },
    cohort: { maxOffset: cohortMonths.length - 1, rows: cohort },
  };
}

// ============================================================
// Marketing
// ============================================================

export function getMarketing(f: Filters) {
  const cur = new Set(periodMonths(f));
  // channel performance aggregated over the period (company-level data)
  const rows = CHANNELS.map((ch) => {
    const cm = CHANNEL_MONTHS.filter((c) => c.channelId === ch.id && cur.has(c.ym));
    const spend = cm.reduce((s, c) => s + c.spend, 0);
    const newCustomers = cm.reduce((s, c) => s + c.newCustomers, 0);
    const bookings = cm.reduce((s, c) => s + c.bookings, 0);
    const revenue = cm.reduce((s, c) => s + c.revenue, 0);
    return { id: ch.id, name: ch.name, kind: ch.kind, spend, newCustomers, bookings, revenue, cpa: newCustomers ? spend / newCustomers : 0, roas: spend ? revenue / spend : 0 };
  }).sort((x, y) => y.newCustomers - x.newCustomers);

  const totals = {
    spend: rows.reduce((s, r) => s + r.spend, 0),
    newCustomers: rows.reduce((s, r) => s + r.newCustomers, 0),
    revenue: rows.reduce((s, r) => s + r.revenue, 0),
  };
  const blendedCpa = totals.newCustomers ? totals.spend / totals.newCustomers : 0;
  const blendedRoas = totals.spend ? totals.revenue / totals.spend : 0;

  // trend trailing 12 (new customers by paid vs owned/organic)
  const t12 = ymRange(shiftYm(CURRENT_YM, -11), CURRENT_YM);
  const trend = t12.map((ym) => {
    const cm = CHANNEL_MONTHS.filter((c) => c.ym === ym);
    const paid = cm.filter((c) => CHANNELS.find((ch) => ch.id === c.channelId)?.kind === "paid").reduce((s, c) => s + c.newCustomers, 0);
    const other = cm.reduce((s, c) => s + c.newCustomers, 0) - paid;
    const spend = cm.reduce((s, c) => s + c.spend, 0);
    return { label: ym, paid, other, spend };
  });

  // online reputation (口コミ) — Google / HotPepper Beauty
  const reviews = {
    googleRating: 4.5,
    hpbRating: 4.4,
    totalReviews: 3820,
    monthlyNew: 142,
    responded: 118,
    responseRate: 118 / 142,
    distribution: [
      { star: 5, count: 2480 },
      { star: 4, count: 920 },
      { star: 3, count: 280 },
      { star: 2, count: 90 },
      { star: 1, count: 50 },
    ],
  };

  // LINE official account / CRM effectiveness
  const line = {
    friends: 18420,
    monthlyBroadcast: 6,
    openRate: 0.62,
    clickRate: 0.14,
    visitsDriven: 540,
    blockRate: 0.018,
  };

  return { rows, totals, blendedCpa, blendedRoas, trend, reviews, line };
}

// ============================================================
// Budget / targets (予実・目標)
// ============================================================

function metricVals(a: Agg) {
  return { revenue: a.revenue, profit: a.operatingProfit, customers: a.customers, newCustomers: a.newCustomers };
}

export function getBudget(f: Filters) {
  const cur = periodMonths(f);
  const prev = comparisonMonths(f);
  const day = Number(TODAY.split("-")[2]);
  const [cy, cm] = CURRENT_YM.split("-").map(Number);
  const dim = new Date(cy, cm, 0).getDate();
  const weights = cur.map((ym) => (ym < CURRENT_YM ? 1 : ym === CURRENT_YM ? day / dim : 0));
  const elapsedFraction = weights.reduce((s, w) => s + w, 0) / cur.length;

  const company = {
    actual: metricVals(aggregate(selectMonths(cur, f))),
    baseline: metricVals(aggregate(selectMonths(prev, f))),
  };

  const brands = (f.brandId === "all" ? BRANDS : BRANDS.filter((b) => b.id === f.brandId)).map((b) => ({
    id: b.id,
    name: b.name,
    color: b.color,
    category: b.category,
    actual: metricVals(aggregate(selectMonths(cur, { ...f, brandId: b.id, storeId: "all" }))),
    baseline: metricVals(aggregate(selectMonths(prev, { ...f, brandId: b.id, storeId: "all" }))),
  }));

  const stores = filteredStores(f).map((s) => ({
    id: s.id,
    name: s.name,
    brandColor: brandById(s.brandId)!.color,
    category: brandById(s.brandId)!.category,
    actual: metricVals(aggregate(selectMonths(cur, { ...f, storeId: s.id }))),
    baseline: metricVals(aggregate(selectMonths(prev, { ...f, storeId: s.id }))),
  }));

  return {
    period: {
      label: cur.length === 1 ? cur[0] : `${cur[0]} 〜 ${cur[cur.length - 1]}`,
      months: cur.length,
      elapsedFraction,
      compareLabel: prev.length === 1 ? prev[0] : `${prev[0]} 〜 ${prev[prev.length - 1]}`,
    },
    company,
    brands,
    stores,
  };
}

// ============================================================
// Inventory & ordering (在庫・発注)
// ============================================================

export function getInventory(f: Filters) {
  const cur = periodMonths(f);
  const a = aggregate(selectMonths(cur, f));
  const items = INVENTORY.map((it) => {
    const value = it.stock * it.unitCost;
    const coverDays = it.monthlyUsage > 0 ? Math.round((it.stock / it.monthlyUsage) * 30) : 999;
    const status: "out" | "low" | "ok" = it.stock <= it.reorderPoint * 0.5 ? "out" : it.stock <= it.reorderPoint ? "low" : "ok";
    const variance = Math.round(value * randFloat(rngFor("inv", it.id), -0.04, 0.01)); // 棚卸差異（多くは減耗）
    const suggestedOrder = it.stock <= it.reorderPoint ? Math.max(0, it.reorderPoint * 2 - it.stock) : 0;
    return { ...it, value, coverDays, status, needsReorder: it.stock <= it.reorderPoint, variance, suggestedOrder };
  });
  const reorderAlerts = items.filter((i) => i.needsReorder).sort((x, y) => x.coverDays - y.coverDays);
  const totalValue = items.reduce((s, i) => s + i.value, 0);
  const materialValue = items.filter((i) => i.type === "材料").reduce((s, i) => s + i.value, 0);
  const retailValue = totalValue - materialValue;
  const varianceTotal = items.reduce((s, i) => s + i.variance, 0);
  return {
    summary: {
      totalValue,
      materialValue,
      retailValue,
      reorderCount: reorderAlerts.length,
      cogs: a.cogs,
      cogsRatio: a.revenue ? a.cogs / a.revenue : 0,
      varianceTotal,
      lossRate: totalValue ? Math.abs(varianceTotal) / totalValue : 0,
    },
    items,
    reorderAlerts,
    byType: [
      { name: "材料", value: materialValue, color: "#0f766e" },
      { name: "店販", value: retailValue, color: "#c0a060" },
    ],
  };
}

// ============================================================
// Cancellation fees (キャンセル料・無断対策)
// ============================================================

export function getCancellations(f: Filters) {
  const cur = periodMonths(f);
  const a = aggregate(selectMonths(cur, f));
  const avgFee = 3300;
  const avgTicket = a.customers ? a.revenue / a.customers : 0;
  const billed = Math.round(a.noShows * avgFee + a.cancellations * 0.1 * avgFee);
  const collectRate = 0.78;
  const collected = Math.round(billed * collectRate);
  const outstanding = billed - collected;
  const opportunityLoss = Math.round((a.cancellations + a.noShows) * avgTicket * 0.6);

  const t12 = trailing12(f);
  const trend = monthlyAggs(t12, f).map(({ ym, agg }) => ({
    label: ym,
    noShows: agg.noShows,
    cancellations: agg.cancellations,
    billed: Math.round(agg.noShows * avgFee + agg.cancellations * 0.1 * avgFee),
  }));

  const offenders = [
    { id: "c1", name: "T. M 様", masked: "•••• 1842", count: 4, lastDate: `${CURRENT_YM}-09`, outstanding: 13200 },
    { id: "c2", name: "K. S 様", masked: "•••• 7705", count: 3, lastDate: `${CURRENT_YM}-07`, outstanding: 9900 },
    { id: "c3", name: "R. Y 様", masked: "•••• 3391", count: 3, lastDate: `${CURRENT_YM}-05`, outstanding: 0 },
    { id: "c4", name: "A. N 様", masked: "•••• 2210", count: 2, lastDate: `${CURRENT_YM}-11`, outstanding: 6600 },
    { id: "c5", name: "M. H 様", masked: "•••• 9087", count: 2, lastDate: `${CURRENT_YM}-03`, outstanding: 3300 },
  ];

  return {
    summary: {
      billed,
      collected,
      outstanding,
      collectRate,
      opportunityLoss,
      noShows: a.noShows,
      cancellations: a.cancellations,
      cancelRate: a.reservations ? a.cancellations / a.reservations : 0,
      noShowRate: a.reservations ? a.noShows / a.reservations : 0,
    },
    trend,
    offenders,
  };
}

// ============================================================
// Funding & tax (資金調達・税務)
// ============================================================

export function getFunding(f: Filters) {
  const loans = [
    { id: "l1", name: "日本政策金融公庫 設備資金", principal: 60_000_000, balance: 38_400_000, rate: 0.012, monthlyPayment: 740_000, remainingMonths: 52 },
    { id: "l2", name: "地方銀行 運転資金", principal: 30_000_000, balance: 12_500_000, rate: 0.008, monthlyPayment: 420_000, remainingMonths: 30 },
    { id: "l3", name: "リース（脱毛機・什器）", principal: 18_000_000, balance: 9_200_000, rate: 0.024, monthlyPayment: 330_000, remainingMonths: 28 },
  ];
  const subsidies = [
    { id: "s1", name: "IT導入補助金（Salon One 導入）", amount: 1_500_000, status: "入金済" as const },
    { id: "s2", name: "事業再構築補助金（新店舗）", amount: 8_000_000, status: "採択" as const },
    { id: "s3", name: "キャリアアップ助成金", amount: 1_140_000, status: "申請中" as const },
    { id: "s4", name: "小規模事業者持続化補助金", amount: 500_000, status: "申請中" as const },
  ];
  const a = aggregate(selectMonths(periodMonths(f), f));
  const taxablePurchase = a.cogs + a.cost.utilities + a.cost.advertising + a.cost.paymentFees + a.cost.other + a.cost.rent;
  const consumptionTaxDue = Math.round(a.revenue * 0.1 - taxablePurchase * 0.1);
  return {
    summary: {
      loanBalance: loans.reduce((s, l) => s + l.balance, 0),
      monthlyRepayment: loans.reduce((s, l) => s + l.monthlyPayment, 0),
      subsidyApproved: subsidies.filter((s) => s.status !== "申請中").reduce((s, x) => s + x.amount, 0),
      subsidyPending: subsidies.filter((s) => s.status === "申請中").reduce((s, x) => s + x.amount, 0),
      consumptionTaxDue,
    },
    loans,
    subsidies,
  };
}

// ============================================================
// Franchise / のれん分け (FC・加盟店)
// ============================================================

export function getFranchise(f: Filters) {
  const stores = [
    { id: "fc1", name: "Lumière 札幌（FC）", brand: "Lumière", color: "#0f766e", area: "札幌", owner: "北海道ビューティ(株)", openedYear: 2021, monthlyRevenue: 5_200_000, royaltyRate: 0.05 },
    { id: "fc2", name: "MOD's Nail 仙台（FC）", brand: "MOD's Nail", color: "#be185d", area: "仙台", owner: "東北ビューティ(株)", openedYear: 2022, monthlyRevenue: 3_100_000, royaltyRate: 0.06 },
    { id: "fc3", name: "Reposer 広島（のれん分け）", brand: "Reposer", color: "#0891b2", area: "広島", owner: "佐藤 健（独立）", openedYear: 2020, monthlyRevenue: 2_700_000, royaltyRate: 0.03 },
    { id: "fc4", name: "Lashé 金沢（FC）", brand: "Lashé", color: "#7c3aed", area: "金沢", owner: "北陸ラッシュ(株)", openedYear: 2023, monthlyRevenue: 2_300_000, royaltyRate: 0.06 },
    { id: "fc5", name: "Esthé Blanc 京都（FC）", brand: "Esthé Blanc", color: "#b45309", area: "京都", owner: "関西エステ(株)", openedYear: 2022, monthlyRevenue: 6_400_000, royaltyRate: 0.05 },
  ];
  const months = periodMonths(f).length;
  const rows = stores.map((s) => ({ ...s, revenue: s.monthlyRevenue * months, royalty: Math.round(s.monthlyRevenue * months * s.royaltyRate) }));
  const totalRevenue = rows.reduce((a, r) => a + r.revenue, 0);
  const totalRoyalty = rows.reduce((a, r) => a + r.royalty, 0);
  return {
    summary: { count: rows.length, totalRevenue, totalRoyalty, avgRoyaltyRate: totalRevenue ? totalRoyalty / totalRevenue : 0, months },
    rows,
  };
}

// ============================================================
// Courses / 役務（前受金）— esthetic course contracts
// ============================================================

export function getCourses(f: Filters) {
  void f;
  const courseNames = ["脱毛 全身コース", "フェイシャル 半年", "痩身 集中コース", "脱毛 VIO", "ブライダルエステ", "美白フェイシャル", "ハイフ 痩身"];
  const stores = ["Esthé Blanc 表参道店", "Esthé Blanc 神戸三宮店"];
  const shinpanCos = ["オリコ", "ジャックス", "セディナ"];
  const surnames = ["佐藤", "鈴木", "高橋", "田中", "渡辺", "伊藤", "山本", "中村", "小林", "加藤", "吉田", "山田", "松本", "井上", "木村"];
  const sessionsOpts = [6, 8, 10, 12, 18, 24];
  const perSessionOpts = [9000, 12000, 18000, 25000];

  const contracts = Array.from({ length: 30 }, (_, i) => {
    const r = rngFor("course", i);
    const sessions = sessionsOpts[Math.floor(r() * sessionsOpts.length)];
    const contractAmount = sessions * perSessionOpts[Math.floor(r() * perSessionOpts.length)];
    const pay = (["一括", "信販", "都度"] as const)[Math.floor(r() * 3)];
    const monthsAgo = Math.floor(r() * 14);
    const signedDate = `${shiftYm(CURRENT_YM, -monthsAgo)}-15`;
    const expiryDate = `${shiftYm(CURRENT_YM, -monthsAgo + 12)}-15`;
    const progress = Math.min(1, (monthsAgo / 10) * randFloat(rngFor("cu", i), 0.7, 1.2));
    const used = Math.min(sessions, Math.round(sessions * progress));
    const roll = r();
    let status: "進行中" | "完了" | "解約" | "失効";
    let refund = 0;
    let penalty = 0;
    let coolingOff = false;
    if (used >= sessions) {
      status = "完了";
    } else if (roll < 0.1) {
      status = "解約";
      refund = Math.round(contractAmount * (1 - used / sessions) * 0.9);
      penalty = Math.round(contractAmount * 0.1);
      if (monthsAgo === 0) {
        coolingOff = true;
        refund = contractAmount;
        penalty = 0;
      }
    } else if (expiryDate < TODAY) {
      status = "失効";
    } else {
      status = "進行中";
    }
    const remaining = status === "進行中" ? Math.round(contractAmount * (1 - used / sessions)) : 0;
    return {
      id: `ct-${i}`,
      customer: `${surnames[Math.floor(r() * surnames.length)]} 様`,
      masked: `•••• ${1000 + Math.floor(r() * 8999)}`,
      store: stores[Math.floor(r() * stores.length)],
      course: courseNames[Math.floor(r() * courseNames.length)],
      sessions,
      used,
      contractAmount,
      remaining,
      paymentType: pay,
      shinpan: pay === "信販" ? shinpanCos[Math.floor(r() * shinpanCos.length)] : "",
      signedDate,
      expiryDate,
      status,
      refund,
      penalty,
      coolingOff,
      consumption: used / sessions,
    };
  });

  const active = contracts.filter((c) => c.status === "進行中");
  const cancels = contracts.filter((c) => c.status === "解約");
  const prepaidBalance = active.reduce((s, c) => s + c.remaining, 0);

  const statusColors: Record<string, string> = { 進行中: "#0f766e", 完了: "#0ea5e9", 解約: "#f43f5e", 失効: "#c0a060" };
  const byStatus = (["進行中", "完了", "解約", "失効"] as const).map((st) => ({ name: st, value: contracts.filter((c) => c.status === st).length, color: statusColors[st] }));
  const payColors: Record<string, string> = { 一括: "#0f766e", 信販: "#c0a060", 都度: "#0ea5e9" };
  const byPayment = (["一括", "信販", "都度"] as const).map((p) => ({ name: p, value: active.filter((c) => c.paymentType === p).reduce((s, c) => s + c.remaining, 0), color: payColors[p] }));
  const shinpanByCompany = shinpanCos.map((co) => ({ name: co, balance: active.filter((c) => c.shinpan === co).reduce((s, c) => s + c.remaining, 0) })).filter((x) => x.balance > 0);

  // consumption projection (役務残高の消化見込)
  const projection: { label: string; balance: number }[] = [];
  let bal = prepaidBalance;
  for (let i = 0; i < 6; i++) {
    projection.push({ label: shiftYm(CURRENT_YM, i), balance: Math.round(bal) });
    bal *= 0.86;
  }

  return {
    summary: {
      prepaidBalance,
      activeCount: active.length,
      consumedThisMonth: Math.round(prepaidBalance * 0.07),
      cancelCount: cancels.length,
      refundTotal: cancels.reduce((s, c) => s + c.refund, 0),
      coolingOffCount: contracts.filter((c) => c.coolingOff).length,
      shinpanBalance: active.filter((c) => c.paymentType === "信販").reduce((s, c) => s + c.remaining, 0),
      avgConsumption: contracts.length ? contracts.reduce((s, c) => s + c.consumption, 0) / contracts.length : 0,
      totalContract: contracts.reduce((s, c) => s + c.contractAmount, 0),
    },
    contracts,
    byStatus,
    byPayment,
    shinpanByCompany,
    projection,
  };
}

// ============================================================
// 整体院: 保険診療・療養費 (insurance reimbursement)
// ============================================================

export function getInsurance(f: Filters) {
  const cur = periodMonths(f);
  const a = aggregate(selectMonths(cur, { ...f, brandId: "karada", storeId: "all" }));
  const totalRev = a.revenue || 8_000_000 * cur.length;
  const insuranceRatio = 0.62;
  const insuranceRev = Math.round(totalRev * insuranceRatio);
  const jihiRev = totalRev - insuranceRev;
  const billed = insuranceRev;
  const paid = Math.round(billed * 0.74); // 受領委任払い（2〜3ヶ月遅れ）
  const pending = billed - paid;
  const returned = Math.round(billed * 0.04); // 返戻
  const assessed = Math.round(billed * 0.02); // 査定減額
  const aging = [
    { name: "1ヶ月以内", value: Math.round(pending * 0.5), color: "#0f766e" },
    { name: "2ヶ月", value: Math.round(pending * 0.3), color: "#c0a060" },
    { name: "3ヶ月以上", value: Math.round(pending * 0.2), color: "#f43f5e" },
  ];
  const t12 = trailing12(f);
  const trend = monthlyAggs(t12, { ...f, brandId: "karada", storeId: "all" }).map(({ ym, agg }) => ({
    label: ym,
    insurance: Math.round((agg.revenue || totalRev) * insuranceRatio),
    jihi: Math.round((agg.revenue || totalRev) * (1 - insuranceRatio)),
  }));
  const insurers = ["協会けんぽ", "国民健康保険", "後期高齢者", "組合健保"];
  const statuses = ["請求中", "入金済", "返戻", "査定"];
  const claims = Array.from({ length: 10 }, (_, i) => {
    const r = rngFor("ins", i);
    const amount = Math.round(randFloat(r, 28000, 160000));
    const st = i < 6 ? "入金済" : i < 8 ? "請求中" : i === 8 ? "返戻" : "査定";
    return {
      id: `ins-${i}`,
      insurer: insurers[Math.floor(r() * insurers.length)],
      patient: `患者 ${String.fromCharCode(65 + i)}`,
      masked: `•••• ${1000 + Math.floor(r() * 8999)}`,
      parts: 1 + Math.floor(r() * 3),
      amount,
      date: `${shiftYm(CURRENT_YM, -Math.floor(r() * 3))}-${String(5 + Math.floor(r() * 20)).padStart(2, "0")}`,
      status: st,
    };
  });
  return {
    summary: { insuranceRev, jihiRev, insuranceRatio, billed, paid, pending, returned, assessed, jihiConversion: 0.28 },
    trend, aging, claims,
  };
}

// ============================================================
// ヘア: スタイリスト・歩合・面貸し (stylist commission)
// ============================================================

export function getStylists(f: Filters) {
  void f;
  const base = STAFF_PERF.filter((s) => s.brandId === "lumiere").sort((a, b) => b.sales - a.sales);
  const n = base.length;
  function rankOf(i: number): { rank: string; rate: number } {
    const p = i / Math.max(1, n);
    if (p < 0.15) return { rank: "ディレクター", rate: 0.5 };
    if (p < 0.45) return { rank: "トップスタイリスト", rate: 0.45 };
    if (p < 0.78) return { rank: "スタイリスト", rate: 0.35 };
    return { rank: "ジュニア", rate: 0.1 };
  }
  const rows = base.map((s, i) => {
    const { rank, rate } = rankOf(i);
    return {
      id: s.id,
      name: s.name,
      store: storeById(s.storeId)!.name,
      rank,
      sales: s.sales,
      designationRate: s.customers ? s.designations / s.customers : 0,
      commissionRate: rate,
      commission: Math.round(s.sales * rate),
    };
  });
  const ranks = ["ディレクター", "トップスタイリスト", "スタイリスト", "ジュニア"];
  const rankColors: Record<string, string> = { ディレクター: "#0f766e", トップスタイリスト: "#0ea5e9", スタイリスト: "#c0a060", ジュニア: "#94a3b8" };
  const rankDist = ranks.map((rk) => ({ name: rk, value: rows.filter((r) => r.rank === rk).length, color: rankColors[rk] }));
  const totalSales = rows.reduce((s, r) => s + r.sales, 0);
  const commissionTotal = rows.reduce((s, r) => s + r.commission, 0);
  const designationAvg = rows.length ? rows.reduce((s, r) => s + r.designationRate, 0) / rows.length : 0;
  // 面貸し・業務委託（フリーランス美容師）
  const freelance = { count: 6, revenue: 7_800_000, chairFee: 1_560_000, payout: 6_240_000 };
  return {
    summary: { totalSales, commissionTotal, designationAvg, stylistCount: rows.length, drugCostRatio: 0.1 },
    rows, rankDist, freelance,
  };
}

// ============================================================
// ネイル・アイラッシュ: 定額制・回転率 (membership / utilisation)
// ============================================================

export function getMembership(f: Filters) {
  const sub = SUBSCRIPTION_MONTHS[SUBSCRIPTION_MONTHS.length - 1];
  const members = Math.round(sub.members * 0.55);
  const plans = [
    { name: "ネイル 通い放題", price: 9800, members: Math.round(members * 0.4) },
    { name: "ネイル 月2回", price: 6800, members: Math.round(members * 0.25) },
    { name: "まつげ 定額（付け替え）", price: 7800, members: Math.round(members * 0.25) },
    { name: "まつげ リペア定額", price: 4800, members: Math.round(members * 0.1) },
  ];
  const mrr = plans.reduce((s, p) => s + p.price * p.members, 0);
  const t12 = trailing12(f);
  void t12;
  const memberTrend = SUBSCRIPTION_MONTHS.slice(-12).map((s) => ({ label: s.ym, members: Math.round(s.members * 0.55) }));
  return {
    summary: {
      members,
      mrr,
      retentionRate: 0.91,
      avgVisitsPerMonth: 1.8,
      turnoverPerDay: 9.4, // 1日あたり回転数
      avgServiceMinutes: 78,
      seatOccupancy: 0.82,
      repeatRatio: 0.72, // アイラッシュ: 付け替えに対するリペア比率
    },
    plans: plans.map((p) => ({ ...p, mrr: p.price * p.members })),
    memberTrend,
  };
}

// ============================================================
// リラク: 資格区分・委託 (qualification / outsourcing)
// ============================================================

export function getRelax(f: Filters) {
  const cur = periodMonths(f);
  const a = aggregate(selectMonths(cur, { ...f, brandId: "reposer", storeId: "all" }));
  const totalRev = a.revenue || 6_000_000 * cur.length;
  const licensedRatio = 0.38; // 国家資格（あん摩マッサージ指圧）施術の割合
  const licensedRev = Math.round(totalRev * licensedRatio);
  const unlicensedRev = totalRev - licensedRev;
  const courses = [
    { name: "60分 もみほぐし", minutes: 60, price: 5500, share: 0.4 },
    { name: "90分 ボディ", minutes: 90, price: 8200, share: 0.32 },
    { name: "120分 全身", minutes: 120, price: 10800, share: 0.18 },
    { name: "リフレ 40分", minutes: 40, price: 4000, share: 0.1 },
  ].map((c) => ({ ...c, revenue: Math.round(totalRev * c.share), unitPerHour: Math.round((c.price / c.minutes) * 60) }));
  const employment = { directRevenue: Math.round(totalRev * 0.55), outsourcedRevenue: Math.round(totalRev * 0.45), outsourcedCount: 8, payoutRate: 0.55 };
  return {
    summary: {
      totalRev,
      licensedRev,
      unlicensedRev,
      licensedRatio,
      ticketBalance: 4_300_000, // 回数券残高（前受金）
      outsourcedRevenue: employment.outsourcedRevenue,
      payout: Math.round(employment.outsourcedRevenue * employment.payoutRate),
    },
    courses,
    employment,
    qualSplit: [
      { name: "国家資格", value: licensedRev, color: "#0f766e" },
      { name: "資格外（リラク）", value: unlicensedRev, color: "#c0a060" },
    ],
  };
}

// ---- exported return types (for components) ------------------------------

export type CatalogData = ReturnType<typeof getCatalog>;
export type InventoryData = ReturnType<typeof getInventory>;
export type CancellationsData = ReturnType<typeof getCancellations>;
export type LaborData = ReturnType<typeof getLabor>;
export type FundingData = ReturnType<typeof getFunding>;
export type FranchiseData = ReturnType<typeof getFranchise>;
export type CoursesData = ReturnType<typeof getCourses>;
export type InsuranceData = ReturnType<typeof getInsurance>;
export type StylistsData = ReturnType<typeof getStylists>;
export type MembershipData = ReturnType<typeof getMembership>;
export type RelaxData = ReturnType<typeof getRelax>;
export type OverviewData = ReturnType<typeof getOverview>;
export type SalesData = ReturnType<typeof getSales>;
export type CashflowData = ReturnType<typeof getCashflow>;
export type ReconciliationData = ReturnType<typeof getReconciliation>;
export type FinancialsData = ReturnType<typeof getFinancials>;
export type StoresData = ReturnType<typeof getStores>;
export type StoreDetailData = NonNullable<ReturnType<typeof getStoreDetail>>;
export type CustomersData = ReturnType<typeof getCustomers>;
export type MarketingData = ReturnType<typeof getMarketing>;
export type BudgetData = ReturnType<typeof getBudget>;
