// The mock data engine. Produces a coherent, deterministic dataset for the
// demo company. Replace the bodies of selectors in ./index.ts with calls to the
// Salon One API to go live — this file is the only place fabricating numbers.

import { CURRENT_YM, shiftYm, ymRange } from "@/lib/filters";
import type {
  ContactMethod,
  ContactSlot,
  PaymentMethodKey,
  ReconItem,
  ReconStatus,
  ReferralLead,
  ReferralStatus,
  SalonCategory,
  Settlement,
  StartPlan,
  StoreMonth,
} from "@/lib/types";
import { FEE_ASSUMPTION, makeLeadId, referrerReward } from "@/lib/referral";
import {
  BRANDS,
  CATEGORY_PROFILE,
  CHANNELS,
  PAYMENT_MIX,
  PROCESSORS,
  STAFF_NAMES,
  STORES,
  brandById,
  processorForMethod,
} from "./catalog";
import { jitter, pick, randFloat, randInt, rngFor, seasonality } from "./random";

// 25 months of history ending at the current month (covers 12m + YoY compare).
export const ALL_MONTHS = ymRange(shiftYm(CURRENT_YM, -24), CURRENT_YM);
const MONTH_INDEX: Record<string, number> = Object.fromEntries(
  ALL_MONTHS.map((ym, i) => [ym, i]),
);

const HIGH_TIER = ["表参道", "銀座", "渋谷", "新宿"];
const LOW_TIER = ["大宮"];

function areaTier(area: string): "high" | "mid" | "low" {
  if (HIGH_TIER.includes(area)) return "high";
  if (LOW_TIER.includes(area)) return "low";
  return "mid";
}

// Per-store fixed characteristics, computed once.
interface StoreParams {
  scale: number; // traffic multiplier
  ticketScale: number;
  growth: number; // monthly growth rate
  rent: number; // fixed monthly
  depreciation: number; // fixed monthly
  utilBase: number;
}

const STORE_PARAMS: Record<string, StoreParams> = {};
for (const s of STORES) {
  const r = rngFor(s.id, "params");
  const tier = areaTier(s.area);
  const rentPerSeat = tier === "high" ? 58000 : tier === "low" ? 30000 : 40000;
  const ticketScale = (tier === "high" ? 1.12 : tier === "low" ? 0.93 : 1.0) * randFloat(rngFor(s.id, "tk"), 0.96, 1.05);
  const maturity = Math.min(1, (2024 - s.openedYear) * 0.05 + 0.7);
  STORE_PARAMS[s.id] = {
    scale: randFloat(r, 0.82, 1.28) * maturity,
    ticketScale,
    growth: randFloat(rngFor(s.id, "g"), 0.002, 0.011),
    rent: s.seats * rentPerSeat,
    depreciation: s.seats * randInt(rngFor(s.id, "dep"), 14000, 22000) * (s.openedYear >= 2022 ? 1.3 : 1),
    utilBase: s.seats * randInt(rngFor(s.id, "ut"), 8000, 13000),
  };
}

function statusAdjustment(storeId: string, t: number): number {
  const s = STORES.find((x) => x.id === storeId)!;
  const last = ALL_MONTHS.length - 1;
  if (s.status === "renovation" && t >= last - 1) return 0.45; // partial close
  if (s.status === "opening") {
    // ramping brand-new store
    const since = t - (last - 8);
    if (since < 0) return 0.55;
    return Math.min(1, 0.6 + since * 0.05);
  }
  // Injected anomaly: one Lumière store dips sharply last month (alert demo).
  if (storeId === "lumiere-yokohama" && t === last) return 0.8;
  return 1;
}

function buildStoreMonth(storeId: string, ym: string): StoreMonth {
  const store = STORES.find((s) => s.id === storeId)!;
  const brand = brandById(store.brandId)!;
  const profile = CATEGORY_PROFILE[brand.category];
  const p = STORE_PARAMS[storeId];
  const t = MONTH_INDEX[ym];
  const monthIdx = Number(ym.split("-")[1]) - 1;
  const r = rngFor(storeId, ym);

  const trend = Math.pow(1 + p.growth, t);
  const season = seasonality(monthIdx);
  const noise = randFloat(r, 0.95, 1.06);
  const statusAdj = statusAdjustment(storeId, t);

  const customers = Math.round(
    profile.custPerStore * p.scale * trend * season * noise * statusAdj,
  );
  const ticket = profile.ticket * p.ticketScale * (1 + 0.0015 * t) * randFloat(rngFor(storeId, ym, "tk"), 0.97, 1.03);
  const gross = customers * ticket;

  const revenueProduct = gross * profile.productRatio * jitter(rngFor(storeId, ym, "pr"), 1, 0.15);
  const revenueSubscription = gross * profile.subRatio * jitter(rngFor(storeId, ym, "sub"), 1, 0.1);
  const revenueOther = gross * 0.012;
  const revenueTech = Math.max(0, gross - revenueProduct - revenueSubscription - revenueOther);

  const noShowRate = 0.014;
  const reservations = Math.round(customers / (1 - profile.cancelRate - noShowRate));
  const cancellations = Math.round(reservations * profile.cancelRate * jitter(rngFor(storeId, ym, "cx"), 1, 0.2));
  const noShows = Math.round(reservations * noShowRate * jitter(rngFor(storeId, ym, "ns"), 1, 0.25));
  const newCustomers = Math.round(customers * (1 - profile.repeat) * jitter(rngFor(storeId, ym, "nw"), 1, 0.12));

  // payment fee = mix-weighted processor fees
  let paymentFees = 0;
  const mix = PAYMENT_MIX[brand.category];
  for (const m of Object.keys(mix) as PaymentMethodKey[]) {
    paymentFees += gross * mix[m] * processorForMethod(m).feeRate;
  }

  const cogs = gross * profile.cogsRatio * jitter(rngFor(storeId, ym, "cg"), 1, 0.08);
  const labor = gross * (profile.laborRatio + 0.1) * jitter(rngFor(storeId, ym, "lb"), 1, 0.05);
  const advertising = gross * profile.adRatio * jitter(rngFor(storeId, ym, "ad"), 1, 0.25);
  const utilities = p.utilBase * jitter(rngFor(storeId, ym, "ut"), 1, 0.12);
  const other = gross * 0.05 * jitter(rngFor(storeId, ym, "ot"), 1, 0.15);

  return {
    storeId,
    brandId: store.brandId,
    ym,
    revenueTech,
    revenueProduct,
    revenueSubscription,
    revenueOther,
    customers,
    newCustomers,
    reservations,
    cancellations,
    noShows,
    cogs,
    cost: { labor, rent: p.rent, utilities, advertising, paymentFees, depreciation: p.depreciation, other },
  };
}

export const STORE_MONTHS: StoreMonth[] = [];
for (const s of STORES) {
  for (const ym of ALL_MONTHS) {
    STORE_MONTHS.push(buildStoreMonth(s.id, ym));
  }
}

export function revenueOf(m: StoreMonth): number {
  return m.revenueTech + m.revenueProduct + m.revenueSubscription + m.revenueOther;
}

export function opexOf(m: StoreMonth): number {
  const c = m.cost;
  return c.labor + c.rent + c.utilities + c.advertising + c.paymentFees + c.depreciation + c.other;
}

// ---- Daily series for the current month ----------------------------------

export interface DailyPoint {
  storeId: string;
  date: string; // ISO
  revenue: number;
  customers: number;
  isFuture: boolean;
}

const TODAY_DAY = 13; // 2026-06-13
export const CURRENT_MONTH_DAYS = 30;

export const STORE_DAILY: DailyPoint[] = [];
for (const s of STORES) {
  const m = STORE_MONTHS.find((x) => x.storeId === s.id && x.ym === CURRENT_YM)!;
  const monthRevenue = revenueOf(m);
  const monthCust = m.customers;
  // distribute by weekday weighting (Fri/Sat busier)
  const weights: number[] = [];
  for (let d = 1; d <= CURRENT_MONTH_DAYS; d++) {
    const dow = new Date(`${CURRENT_YM}-${String(d).padStart(2, "0")}T00:00:00`).getDay();
    const base = dow === 5 || dow === 6 ? 1.45 : dow === 0 ? 1.2 : dow === 1 ? 0.75 : 1.0;
    weights.push(base * randFloat(rngFor(s.id, "d", d), 0.85, 1.15));
  }
  const wsum = weights.reduce((a, b) => a + b, 0);
  for (let d = 1; d <= CURRENT_MONTH_DAYS; d++) {
    const date = `${CURRENT_YM}-${String(d).padStart(2, "0")}`;
    STORE_DAILY.push({
      storeId: s.id,
      date,
      revenue: (monthRevenue * weights[d - 1]) / wsum,
      customers: Math.round((monthCust * weights[d - 1]) / wsum),
      isFuture: d > TODAY_DAY,
    });
  }
}

// ---- Settlement schedule (current month payouts) -------------------------

function currentMonthMethodGross(method: PaymentMethodKey): number {
  let g = 0;
  for (const m of STORE_MONTHS) {
    if (m.ym !== CURRENT_YM) continue;
    const brand = brandById(m.brandId)!;
    g += revenueOf(m) * PAYMENT_MIX[brand.category][method];
  }
  return g;
}

export const SETTLEMENTS: Settlement[] = [];
{
  const methods: PaymentMethodKey[] = ["credit", "qr", "emoney", "subscription"];
  let idx = 0;
  for (const method of methods) {
    const proc = processorForMethod(method);
    const gross = currentMonthMethodGross(method);
    // split into 3 payouts: two paid (early month), one scheduled (late)
    const splits = [
      { frac: 0.34, day: 5, status: "paid" as const },
      { frac: 0.33, day: 12, status: "paid" as const },
      { frac: 0.33, day: 26, status: "scheduled" as const },
    ];
    for (const sp of splits) {
      const g = gross * sp.frac;
      const fee = g * proc.feeRate;
      SETTLEMENTS.push({
        id: `stl-${idx++}`,
        processorId: proc.id,
        method,
        gross: g,
        fee,
        net: g - fee,
        date: `${CURRENT_YM}-${String(sp.day).padStart(2, "0")}`,
        status: sp.status,
        storeId: "all",
      });
    }
  }
  // Injected anomaly: one delayed payout (demo for cashflow alert).
  const proc = processorForMethod("qr");
  const g = currentMonthMethodGross("qr") * 0.08;
  SETTLEMENTS.push({
    id: `stl-${idx++}`,
    processorId: proc.id,
    method: "qr",
    gross: g,
    fee: g * proc.feeRate,
    net: g * (1 - proc.feeRate),
    date: `${CURRENT_YM}-08`,
    status: "delayed",
    storeId: "all",
  });
}

// ---- Reconciliation items -------------------------------------------------

export const RECON_ITEMS: ReconItem[] = [];
{
  const methods: PaymentMethodKey[] = ["credit", "qr", "emoney", "cash"];
  let idx = 0;
  // Mostly-matched daily rows for several stores; inject a few discrepancies.
  const sampleStores = STORES.slice(0, 8);
  for (const s of sampleStores) {
    for (const method of methods) {
      const r = rngFor("recon", s.id, method);
      const recorded = Math.round(randFloat(r, 80000, 420000));
      // Most match exactly; ~25% have a small discrepancy.
      const roll = r();
      let settled = recorded;
      let status: ReconStatus = "matched";
      let note = "一致";
      if (roll < 0.12) {
        settled = recorded - Math.round(recorded * randFloat(r, 0.01, 0.04));
        status = "unmatched";
        note = method === "cash" ? "レジ現金の過不足" : "返金/チャージバック差異の可能性";
      } else if (roll < 0.27) {
        settled = recorded - Math.round(randFloat(r, 200, 1800));
        status = "investigating";
        note = "手数料控除額の確認中";
      }
      RECON_ITEMS.push({
        id: `rec-${idx++}`,
        date: `${CURRENT_YM}-${String(randInt(r, 1, TODAY_DAY)).padStart(2, "0")}`,
        storeId: s.id,
        method,
        processorId: processorForMethod(method).id,
        recorded,
        settled,
        status,
        note,
      });
    }
  }
}

// ---- Marketing channel performance (monthly) -----------------------------

export interface ChannelMonth {
  channelId: string;
  ym: string;
  spend: number;
  newCustomers: number;
  bookings: number;
  revenue: number;
}

export const CHANNEL_MONTHS: ChannelMonth[] = [];
{
  // company-level new customers per month (sum of stores)
  for (const ym of ALL_MONTHS) {
    const totalNew = STORE_MONTHS.filter((m) => m.ym === ym).reduce((a, m) => a + m.newCustomers, 0);
    // share of acquisition by channel
    const shares: Record<string, number> = {
      hotpepper: 0.34, minimo: 0.1, instagram: 0.16, line: 0.12, google: 0.14, referral: 0.1, web: 0.04,
    };
    for (const ch of CHANNELS) {
      const r = rngFor("ch", ch.id, ym);
      const share = shares[ch.id] * jitter(r, 1, 0.12);
      const newCustomers = Math.round(totalNew * share);
      const bookings = Math.round(newCustomers * randFloat(r, 1.15, 1.6));
      // cost per acquisition by channel kind
      const cpa = ch.kind === "paid" ? randFloat(r, 3800, 9200) : ch.kind === "owned" ? randFloat(r, 300, 1200) : 0;
      const spend = Math.round(newCustomers * cpa);
      const ltvProxy = randFloat(r, 21000, 46000);
      const revenue = Math.round(newCustomers * ltvProxy);
      CHANNEL_MONTHS.push({ channelId: ch.id, ym, spend, newCustomers, bookings, revenue });
    }
  }
}

// ---- Staff performance (current month) -----------------------------------

export interface StaffPerf {
  id: string;
  name: string;
  storeId: string;
  brandId: string;
  sales: number;
  designations: number; // 指名数
  customers: number;
  retentionRate: number; // 再来率
}

export const STAFF_PERF: StaffPerf[] = [];
{
  let nameIdx = 0;
  for (const s of STORES) {
    const m = STORE_MONTHS.find((x) => x.storeId === s.id && x.ym === CURRENT_YM)!;
    const techRev = m.revenueTech;
    const n = Math.min(6, Math.max(3, Math.round(s.staff * 0.45)));
    // random shares summing to 1
    const r = rngFor("staff", s.id);
    const raw = Array.from({ length: n }, () => randFloat(r, 0.6, 1.6));
    const sum = raw.reduce((a, b) => a + b, 0);
    for (let i = 0; i < n; i++) {
      const share = raw[i] / sum;
      const sales = techRev * share;
      const customers = Math.round((m.customers * share) || 0);
      STAFF_PERF.push({
        id: `staff-${s.id}-${i}`,
        name: STAFF_NAMES[nameIdx++ % STAFF_NAMES.length],
        storeId: s.id,
        brandId: s.brandId,
        sales,
        designations: Math.round(customers * randFloat(rngFor("dsg", s.id, i), 0.35, 0.72)),
        customers,
        retentionRate: randFloat(rngFor("ret", s.id, i), 0.52, 0.84),
      });
    }
  }
}

// ---- Prepaid liability (前受金 / 役務) & subscription (MRR) ----------------

export interface PrepaidMonth {
  ym: string;
  sold: number; // 当月販売（前受）
  consumed: number; // 当月消化（売上計上）
  balance: number; // 期末残高（負債）
}

export const PREPAID_MONTHS: PrepaidMonth[] = [];
{
  let balance = 0;
  // seed an opening balance
  balance = 78_000_000;
  for (const ym of ALL_MONTHS) {
    const monthRows = STORE_MONTHS.filter((m) => m.ym === ym);
    let sold = 0;
    let consumed = 0;
    for (const m of monthRows) {
      const brand = brandById(m.brandId)!;
      const prepaidShare = PAYMENT_MIX[brand.category].prepaid;
      const rev = revenueOf(m);
      // consumed ≈ prepaid-paid portion of recognised revenue
      consumed += rev * prepaidShare;
      // sold ≈ slightly more than consumed for esthetic-heavy growth
      sold += rev * prepaidShare * (brand.category === "esthetic" ? 1.18 : 1.04);
    }
    balance += sold - consumed;
    PREPAID_MONTHS.push({ ym, sold, consumed, balance });
  }
}

export interface SubscriptionMonth {
  ym: string;
  members: number;
  mrr: number;
  newMembers: number;
  churnedMembers: number;
}

export const SUBSCRIPTION_MONTHS: SubscriptionMonth[] = [];
{
  let members = 0;
  for (const ym of ALL_MONTHS) {
    const subRev = STORE_MONTHS.filter((m) => m.ym === ym).reduce((a, m) => a + m.revenueSubscription, 0);
    const avgPrice = 5200;
    const target = Math.round(subRev / avgPrice);
    const prev = members || Math.round(target * 0.96);
    const churnRate = randFloat(rngFor("churn", ym), 0.03, 0.055);
    const churned = Math.round(prev * churnRate);
    const newM = target - prev + churned;
    members = target;
    SUBSCRIPTION_MONTHS.push({ ym, members, mrr: subRev, newMembers: Math.max(0, newM), churnedMembers: churned });
  }
}

// Convenience: a tiny pool used by the reports view.
export const SAMPLE_PROCESSOR_NAMES = PROCESSORS.map((p) => p.name);
export const ANY_CHANNEL = () => pick(rngFor("x"), CHANNELS);

// ---- Inventory & ordering (材料・店販在庫) --------------------------------

export interface InventoryItem {
  id: string;
  name: string;
  type: "材料" | "店販";
  unit: string;
  unitCost: number;
  stock: number;
  reorderPoint: number;
  monthlyUsage: number;
  supplier: string;
  leadDays: number;
}

const INV_SEED: Omit<InventoryItem, "id">[] = [
  { name: "カラー剤 6%（共通）", type: "材料", unit: "本", unitCost: 480, stock: 62, reorderPoint: 40, monthlyUsage: 120, supplier: "ミルボン", leadDays: 3 },
  { name: "カラー剤 ファッション系", type: "材料", unit: "本", unitCost: 620, stock: 22, reorderPoint: 30, monthlyUsage: 70, supplier: "ウエラ", leadDays: 4 },
  { name: "オキシ（2剤）", type: "材料", unit: "本", unitCost: 380, stock: 84, reorderPoint: 50, monthlyUsage: 90, supplier: "ミルボン", leadDays: 3 },
  { name: "パーマ液 セット", type: "材料", unit: "セット", unitCost: 720, stock: 18, reorderPoint: 20, monthlyUsage: 25, supplier: "アリミノ", leadDays: 5 },
  { name: "トリートメント材（バック）", type: "材料", unit: "本", unitCost: 1200, stock: 36, reorderPoint: 25, monthlyUsage: 40, supplier: "ナプラ", leadDays: 4 },
  { name: "縮毛矯正剤 セット", type: "材料", unit: "セット", unitCost: 980, stock: 14, reorderPoint: 12, monthlyUsage: 16, supplier: "ミルボン", leadDays: 6 },
  { name: "ホイル / コットン", type: "材料", unit: "箱", unitCost: 850, stock: 11, reorderPoint: 15, monthlyUsage: 18, supplier: "共通備品", leadDays: 2 },
  { name: "ジェル クリア", type: "材料", unit: "個", unitCost: 1400, stock: 42, reorderPoint: 30, monthlyUsage: 35, supplier: "プリジェル", leadDays: 5 },
  { name: "ジェル カラー（各色）", type: "材料", unit: "個", unitCost: 1600, stock: 96, reorderPoint: 60, monthlyUsage: 70, supplier: "パラジェル", leadDays: 6 },
  { name: "アセトン / リムーバー", type: "材料", unit: "L", unitCost: 700, stock: 20, reorderPoint: 18, monthlyUsage: 22, supplier: "共通備品", leadDays: 3 },
  { name: "ネイルファイル", type: "材料", unit: "本", unitCost: 90, stock: 210, reorderPoint: 150, monthlyUsage: 180, supplier: "共通備品", leadDays: 2 },
  { name: "グルー（まつげ）", type: "材料", unit: "本", unitCost: 2200, stock: 15, reorderPoint: 20, monthlyUsage: 26, supplier: "松風", leadDays: 7 },
  { name: "エクステ毛（各カール）", type: "材料", unit: "箱", unitCost: 1300, stock: 58, reorderPoint: 40, monthlyUsage: 48, supplier: "ビューラッシュ", leadDays: 5 },
  { name: "リムーバー（まつげ）", type: "材料", unit: "本", unitCost: 1500, stock: 23, reorderPoint: 18, monthlyUsage: 20, supplier: "松風", leadDays: 6 },
  { name: "痩身ジェル", type: "材料", unit: "個", unitCost: 3200, stock: 25, reorderPoint: 20, monthlyUsage: 26, supplier: "業務用商社", leadDays: 7 },
  { name: "脱毛ジェル", type: "材料", unit: "L", unitCost: 2600, stock: 31, reorderPoint: 25, monthlyUsage: 28, supplier: "業務用商社", leadDays: 7 },
  { name: "パック剤（フェイシャル）", type: "材料", unit: "箱", unitCost: 4200, stock: 9, reorderPoint: 12, monthlyUsage: 14, supplier: "業務用商社", leadDays: 8 },
  { name: "マッサージオイル", type: "材料", unit: "L", unitCost: 1800, stock: 29, reorderPoint: 20, monthlyUsage: 24, supplier: "共通備品", leadDays: 4 },
  { name: "フェイスタオル（消耗）", type: "材料", unit: "枚", unitCost: 120, stock: 420, reorderPoint: 300, monthlyUsage: 320, supplier: "リネン業者", leadDays: 3 },
  { name: "シャンプー（店販）", type: "店販", unit: "本", unitCost: 1600, stock: 72, reorderPoint: 40, monthlyUsage: 55, supplier: "ミルボン", leadDays: 4 },
  { name: "トリートメント（店販）", type: "店販", unit: "本", unitCost: 1900, stock: 61, reorderPoint: 40, monthlyUsage: 50, supplier: "ミルボン", leadDays: 4 },
  { name: "ヘアオイル（店販）", type: "店販", unit: "本", unitCost: 2400, stock: 34, reorderPoint: 25, monthlyUsage: 30, supplier: "ナプラ", leadDays: 5 },
  { name: "化粧水（店販）", type: "店販", unit: "本", unitCost: 2800, stock: 27, reorderPoint: 20, monthlyUsage: 24, supplier: "業務用商社", leadDays: 6 },
  { name: "美容液（店販）", type: "店販", unit: "本", unitCost: 4800, stock: 17, reorderPoint: 15, monthlyUsage: 16, supplier: "業務用商社", leadDays: 6 },
];

export const INVENTORY: InventoryItem[] = INV_SEED.map((s, i) => ({ id: `inv-${i}`, ...s }));

// ---- 紹介制度：申込（リード）--------------------------------------------
// 公開フォーム（/referral/apply）から届く申込のモック。直近7ヶ月分を決定論的に
// 生成します。連携時は Salon One / CRM のリードを同じ形にマッピングしてください。

const REFERRERS: { name: string; salon: string; code: string }[] = [
  { name: "田村 佳奈", salon: "hair atelier NOA", code: "REF-NOA31" },
  { name: "上村 健太", salon: "BARBER UEMURA", code: "REF-UEM07" },
  { name: "西野 千尋", salon: "nail room Lien", code: "REF-LIEN9" },
  { name: "堀内 麻衣", salon: "eyelash SHEEN", code: "REF-SHN22" },
  { name: "藤原 大地", salon: "整体院 からだ堂", code: "REF-KRD14" },
  { name: "岡田 里奈", salon: "Relaxation AOI", code: "REF-AOI55" },
  { name: "宮本 悠介", salon: "Esthe Lumina", code: "REF-LMN03" },
  { name: "笹川 直美", salon: "hair&make SASA", code: "REF-SAS18" },
];

const APPLICANTS: { company: string; contact: string; categories: SalonCategory[]; stores: number }[] = [
  { company: "株式会社ベルフィオーレ", contact: "小田切 恵", categories: ["hair"], stores: 3 },
  { company: "nail salon Cotton", contact: "早瀬 真由", categories: ["nail"], stores: 1 },
  { company: "有限会社ヘアズ北浜", contact: "北浜 徹", categories: ["hair"], stores: 5 },
  { company: "Lash Studio Mirai", contact: "三浦 のぞみ", categories: ["eyelash"], stores: 2 },
  { company: "からだ整骨院グループ", contact: "本間 幸雄", categories: ["osteopathy"], stores: 6 },
  { company: "リラクゼーション凪", contact: "永井 千夏", categories: ["relax"], stores: 2 },
  { company: "エステサロン Blanche", contact: "浅井 亜美", categories: ["esthetic"], stores: 1 },
  { company: "株式会社ミモザ", contact: "室井 大輔", categories: ["hair", "nail"], stores: 4 },
  { company: "salon de Lien", contact: "柳沢 美穂", categories: ["nail", "eyelash"], stores: 2 },
  { company: "整体&リラク こもれび", contact: "小森 亮", categories: ["osteopathy", "relax"], stores: 3 },
  { company: "Hair Design QUON", contact: "久遠 翔太", categories: ["hair"], stores: 2 },
  { company: "Beauty Works 湘南", contact: "江ノ島 智子", categories: ["esthetic", "relax"], stores: 1 },
];

const METHODS: ContactMethod[] = ["phone", "email", "line", "sms", "online"];
const SLOTS: ContactSlot[] = ["am", "noon", "pm", "evening", "anytime"];
const START_PLANS: StartPlan[] = ["asap", "within1m", "within3m", "undecided"];
const NOTES = [
  "現在は紙台帳とエクセルで管理しています。予約と会計の一元化を相談したいです。",
  "他社システムからの乗り換えを検討中。データ移行が可能か知りたいです。",
  "2店舗目の出店にあわせて導入を検討しています。",
  "スタッフの歩合計算に時間がかかっており、自動化したいです。",
  "",
  "",
  "サブスク（定額制）の運用ができるか確認したいです。",
  "料金プランの詳細と、紹介特典の適用条件を教えてください。",
];

/** 月末日（"YYYY-MM"）。 */
function lastDayOfYm(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

export const REFERRAL_LEADS: ReferralLead[] = [];
{
  const months = ymRange(shiftYm(CURRENT_YM, -6), CURRENT_YM);
  let seq = 1;
  months.forEach((ym, mi) => {
    const monthAge = months.length - 1 - mi; // 0 = 当月
    const r = rngFor("referral", ym);
    const count = randInt(r, 3, 6);
    for (let i = 0; i < count; i++) {
      const maxDay = ym === CURRENT_YM ? TODAY_DAY : lastDayOfYm(ym);
      const day = randInt(r, 1, maxDay);
      const submittedAt = `${ym}-${String(day).padStart(2, "0")}T${String(randInt(r, 9, 20)).padStart(2, "0")}:${pick(r, ["05", "17", "23", "41", "58"])}:00+09:00`;
      const ref = pick(r, REFERRERS);
      const app = APPLICANTS[(seq * 5 + i) % APPLICANTS.length];
      const method = pick(r, METHODS);
      const submittedDate = `${ym}-${String(day).padStart(2, "0")}`;
      const preferredDate1 = addDaysIso(submittedDate, randInt(r, 1, 6));
      const hasSecond = r() < 0.65;

      // 古い申込ほど決着済み。当月は未対応・連絡済が中心。
      const roll = r();
      let status: ReferralStatus;
      if (monthAge === 0) status = roll < 0.45 ? "new" : roll < 0.8 ? "contacted" : "appointment";
      else if (monthAge === 1) status = roll < 0.12 ? "new" : roll < 0.35 ? "contacted" : roll < 0.6 ? "appointment" : roll < 0.85 ? "won" : "lost";
      else status = roll < 0.1 ? "contacted" : roll < 0.22 ? "appointment" : roll < 0.72 ? "won" : "lost";

      const fee = FEE_ASSUMPTION.byStoreCount(app.stores);
      const won = status === "won";
      const startDate = won ? addDaysIso(submittedDate, randInt(r, 18, 45)) : undefined;

      REFERRAL_LEADS.push({
        id: makeLeadId(submittedAt, seq++),
        submittedAt,
        referrerName: ref.name,
        referrerSalon: ref.salon,
        referrerCode: r() < 0.6 ? ref.code : undefined,
        companyName: app.company,
        contactName: app.contact,
        phone: `0${randInt(r, 3, 9)}0-${String(randInt(r, 1000, 9999))}-${String(randInt(r, 1000, 9999))}`,
        email: `info@${["belfiore", "cotton-nail", "hairs", "mirai", "karada", "nagi", "blanche", "mimosa", "lien", "komorebi", "quon", "bw-shonan"][(seq + i) % 12]}.example.jp`,
        lineId: method === "line" ? `@salon${randInt(r, 100, 999)}` : undefined,
        storeCount: app.stores,
        categories: app.categories,
        contactMethod: method,
        preferredDate1,
        preferredSlot1: pick(r, SLOTS),
        preferredDate2: hasSecond ? addDaysIso(preferredDate1, randInt(r, 1, 5)) : undefined,
        preferredSlot2: hasSecond ? pick(r, SLOTS) : undefined,
        startPlan: pick(r, START_PLANS),
        note: pick(r, NOTES) || undefined,
        status,
        initialFee: won ? fee.initialFee : undefined,
        reward: won ? referrerReward(fee.initialFee) : undefined,
        rewardPaid: won ? monthAge >= 3 : undefined, // 支払いは成約の翌月末 → 直近の成約は未払い
        startDate,
      });
    }
  });
}
