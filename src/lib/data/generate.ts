// The mock data engine. Produces a coherent, deterministic dataset for
// whatever masters (brands / stores) it is given — either the demo company's
// mock catalog or the REAL masters synced from the Salon One API (phase 1).
// Every number here is fabricated; phase 2 replaces the transactional facts
// (StoreMonth etc.) with real aggregates while keeping the same shapes.

import { CURRENT_YM, shiftYm, ymRange } from "@/lib/filters";
import type {
  Brand,
  PaymentMethodKey,
  ReconItem,
  ReconStatus,
  Settlement,
  Store,
  StoreMonth,
} from "@/lib/types";
import {
  CATEGORY_PROFILE,
  CHANNELS,
  PAYMENT_MIX,
  STAFF_NAMES,
  processorForMethod,
} from "./catalog";
import { jitter, randFloat, randInt, rngFor, seasonality } from "./random";

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

export function revenueOf(m: StoreMonth): number {
  return m.revenueTech + m.revenueProduct + m.revenueSubscription + m.revenueOther;
}

export function opexOf(m: StoreMonth): number {
  const c = m.cost;
  return c.labor + c.rent + c.utilities + c.advertising + c.paymentFees + c.depreciation + c.other;
}

// ---- shapes produced by the builder ---------------------------------------

export interface DailyPoint {
  storeId: string;
  date: string; // ISO
  revenue: number;
  customers: number;
  isFuture: boolean;
}

export interface ChannelMonth {
  channelId: string;
  ym: string;
  spend: number;
  newCustomers: number;
  bookings: number;
  revenue: number;
}

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

export interface PrepaidMonth {
  ym: string;
  sold: number; // 当月販売（前受）
  consumed: number; // 当月消化（売上計上）
  balance: number; // 期末残高（負債）
}

export interface SubscriptionMonth {
  ym: string;
  members: number;
  mrr: number;
  newMembers: number;
  churnedMembers: number;
}

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

export interface GeneratedData {
  brands: Brand[];
  stores: Store[];
  storeMonths: StoreMonth[];
  storeDaily: DailyPoint[];
  settlements: Settlement[];
  reconItems: ReconItem[];
  channelMonths: ChannelMonth[];
  staffPerf: StaffPerf[];
  prepaidMonths: PrepaidMonth[];
  subscriptionMonths: SubscriptionMonth[];
  inventory: InventoryItem[];
}

const TODAY_DAY = 13; // 2026-06-13
export const CURRENT_MONTH_DAYS = 30;

// ---- the builder -----------------------------------------------------------

/**
 * Build the full (deterministic) dataset for the given masters.
 * `staffByStore` — when real staff are known (Salon One sync), their names
 * are used for the staff-performance rows instead of the mock name pool.
 */
export function buildDataset(
  brands: Brand[],
  stores: Store[],
  staffByStore?: Record<string, { id: string; name: string }[]>,
): GeneratedData {
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const brandOf = (id: string): Brand => brandMap.get(id) ?? brands[0];

  // Per-store fixed characteristics, computed once.
  interface StoreParams {
    scale: number; // traffic multiplier
    ticketScale: number;
    growth: number; // monthly growth rate
    rent: number; // fixed monthly
    depreciation: number; // fixed monthly
    utilBase: number;
  }

  const storeParams: Record<string, StoreParams> = {};
  for (const s of stores) {
    const r = rngFor(s.id, "params");
    const tier = areaTier(s.area);
    const rentPerSeat = tier === "high" ? 58000 : tier === "low" ? 30000 : 40000;
    const ticketScale = (tier === "high" ? 1.12 : tier === "low" ? 0.93 : 1.0) * randFloat(rngFor(s.id, "tk"), 0.96, 1.05);
    const maturity = Math.min(1, Math.max(0.6, (2024 - s.openedYear) * 0.05 + 0.7));
    storeParams[s.id] = {
      scale: randFloat(r, 0.82, 1.28) * maturity,
      ticketScale,
      growth: randFloat(rngFor(s.id, "g"), 0.002, 0.011),
      rent: s.seats * rentPerSeat,
      depreciation: s.seats * randInt(rngFor(s.id, "dep"), 14000, 22000) * (s.openedYear >= 2022 ? 1.3 : 1),
      utilBase: s.seats * randInt(rngFor(s.id, "ut"), 8000, 13000),
    };
  }

  function statusAdjustment(store: Store, t: number): number {
    const last = ALL_MONTHS.length - 1;
    if (store.status === "renovation" && t >= last - 1) return 0.45; // partial close
    if (store.status === "opening") {
      // ramping brand-new store
      const since = t - (last - 8);
      if (since < 0) return 0.55;
      return Math.min(1, 0.6 + since * 0.05);
    }
    // Injected anomaly: one Lumière store dips sharply last month (alert demo).
    if (store.id === "lumiere-yokohama" && t === last) return 0.8;
    return 1;
  }

  function buildStoreMonth(store: Store, ym: string): StoreMonth {
    const brand = brandOf(store.brandId);
    const profile = CATEGORY_PROFILE[brand.category];
    const p = storeParams[store.id];
    const t = MONTH_INDEX[ym];
    const monthIdx = Number(ym.split("-")[1]) - 1;
    const r = rngFor(store.id, ym);

    const trend = Math.pow(1 + p.growth, t);
    const season = seasonality(monthIdx);
    const noise = randFloat(r, 0.95, 1.06);
    const statusAdj = statusAdjustment(store, t);

    const customers = Math.round(
      profile.custPerStore * p.scale * trend * season * noise * statusAdj,
    );
    const ticket = profile.ticket * p.ticketScale * (1 + 0.0015 * t) * randFloat(rngFor(store.id, ym, "tk"), 0.97, 1.03);
    const gross = customers * ticket;

    const revenueProduct = gross * profile.productRatio * jitter(rngFor(store.id, ym, "pr"), 1, 0.15);
    const revenueSubscription = gross * profile.subRatio * jitter(rngFor(store.id, ym, "sub"), 1, 0.1);
    const revenueOther = gross * 0.012;
    const revenueTech = Math.max(0, gross - revenueProduct - revenueSubscription - revenueOther);

    const noShowRate = 0.014;
    const reservations = Math.round(customers / (1 - profile.cancelRate - noShowRate));
    const cancellations = Math.round(reservations * profile.cancelRate * jitter(rngFor(store.id, ym, "cx"), 1, 0.2));
    const noShows = Math.round(reservations * noShowRate * jitter(rngFor(store.id, ym, "ns"), 1, 0.25));
    const newCustomers = Math.round(customers * (1 - profile.repeat) * jitter(rngFor(store.id, ym, "nw"), 1, 0.12));

    // payment fee = mix-weighted processor fees
    let paymentFees = 0;
    const mix = PAYMENT_MIX[brand.category];
    for (const m of Object.keys(mix) as PaymentMethodKey[]) {
      paymentFees += gross * mix[m] * processorForMethod(m).feeRate;
    }

    const cogs = gross * profile.cogsRatio * jitter(rngFor(store.id, ym, "cg"), 1, 0.08);
    const labor = gross * (profile.laborRatio + 0.1) * jitter(rngFor(store.id, ym, "lb"), 1, 0.05);
    const advertising = gross * profile.adRatio * jitter(rngFor(store.id, ym, "ad"), 1, 0.25);
    const utilities = p.utilBase * jitter(rngFor(store.id, ym, "ut"), 1, 0.12);
    const other = gross * 0.05 * jitter(rngFor(store.id, ym, "ot"), 1, 0.15);

    return {
      storeId: store.id,
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

  const storeMonths: StoreMonth[] = [];
  for (const s of stores) {
    for (const ym of ALL_MONTHS) {
      storeMonths.push(buildStoreMonth(s, ym));
    }
  }

  // ---- Daily series for the current month ----------------------------------

  const storeDaily: DailyPoint[] = [];
  for (const s of stores) {
    const m = storeMonths.find((x) => x.storeId === s.id && x.ym === CURRENT_YM)!;
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
      storeDaily.push({
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
    for (const m of storeMonths) {
      if (m.ym !== CURRENT_YM) continue;
      g += revenueOf(m) * PAYMENT_MIX[brandOf(m.brandId).category][method];
    }
    return g;
  }

  const settlements: Settlement[] = [];
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
        settlements.push({
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
    settlements.push({
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

  const reconItems: ReconItem[] = [];
  {
    const methods: PaymentMethodKey[] = ["credit", "qr", "emoney", "cash"];
    let idx = 0;
    // Mostly-matched daily rows for several stores; inject a few discrepancies.
    const sampleStores = stores.slice(0, 8);
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
        reconItems.push({
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

  const channelMonths: ChannelMonth[] = [];
  {
    // company-level new customers per month (sum of stores)
    for (const ym of ALL_MONTHS) {
      const totalNew = storeMonths.filter((m) => m.ym === ym).reduce((a, m) => a + m.newCustomers, 0);
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
        channelMonths.push({ channelId: ch.id, ym, spend, newCustomers, bookings, revenue });
      }
    }
  }

  // ---- Staff performance (current month) -----------------------------------
  // With a Salon One sync, the REAL staff roster (names / ids) is used; the
  // performance numbers stay fabricated until phase 2.

  const staffPerf: StaffPerf[] = [];
  {
    let nameIdx = 0;
    for (const s of stores) {
      const m = storeMonths.find((x) => x.storeId === s.id && x.ym === CURRENT_YM)!;
      const techRev = m.revenueTech;
      const real = staffByStore?.[s.id];
      const n = real?.length
        ? Math.min(8, real.length)
        : Math.min(6, Math.max(3, Math.round(s.staff * 0.45)));
      // random shares summing to 1
      const r = rngFor("staff", s.id);
      const raw = Array.from({ length: n }, () => randFloat(r, 0.6, 1.6));
      const sum = raw.reduce((a, b) => a + b, 0);
      for (let i = 0; i < n; i++) {
        const share = raw[i] / sum;
        const sales = techRev * share;
        const customers = Math.round((m.customers * share) || 0);
        staffPerf.push({
          id: real?.[i]?.id ?? `staff-${s.id}-${i}`,
          name: real?.[i]?.name ?? STAFF_NAMES[nameIdx++ % STAFF_NAMES.length],
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

  const prepaidMonths: PrepaidMonth[] = [];
  {
    // seed an opening balance
    let balance = 78_000_000;
    for (const ym of ALL_MONTHS) {
      const monthRows = storeMonths.filter((m) => m.ym === ym);
      let sold = 0;
      let consumed = 0;
      for (const m of monthRows) {
        const brand = brandOf(m.brandId);
        const prepaidShare = PAYMENT_MIX[brand.category].prepaid;
        const rev = revenueOf(m);
        // consumed ≈ prepaid-paid portion of recognised revenue
        consumed += rev * prepaidShare;
        // sold ≈ slightly more than consumed for esthetic-heavy growth
        sold += rev * prepaidShare * (brand.category === "esthetic" ? 1.18 : 1.04);
      }
      balance += sold - consumed;
      prepaidMonths.push({ ym, sold, consumed, balance });
    }
  }

  const subscriptionMonths: SubscriptionMonth[] = [];
  {
    let members = 0;
    for (const ym of ALL_MONTHS) {
      const subRev = storeMonths.filter((m) => m.ym === ym).reduce((a, m) => a + m.revenueSubscription, 0);
      const avgPrice = 5200;
      const target = Math.round(subRev / avgPrice);
      const prev = members || Math.round(target * 0.96);
      const churnRate = randFloat(rngFor("churn", ym), 0.03, 0.055);
      const churned = Math.round(prev * churnRate);
      const newM = target - prev + churned;
      members = target;
      subscriptionMonths.push({ ym, members, mrr: subRev, newMembers: Math.max(0, newM), churnedMembers: churned });
    }
  }

  return {
    brands,
    stores,
    storeMonths,
    storeDaily,
    settlements,
    reconItems,
    channelMonths,
    staffPerf,
    prepaidMonths,
    subscriptionMonths,
    inventory: INVENTORY,
  };
}

// ---- Inventory & ordering (材料・店販在庫) — store-independent mock --------

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
