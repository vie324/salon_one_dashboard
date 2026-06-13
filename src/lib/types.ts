// ============================================================
// Salon One — Management Console : Domain types
// ============================================================
// These types describe the *management-side* view of the data that the
// Salon One field system produces. The mock layer (src/lib/data) currently
// fabricates these shapes; the future integration will populate them from the
// Salon One API. Keep this file as the contract between the two.

export type SalonCategory =
  | "hair" // ヘアサロン
  | "nail" // ネイルサロン
  | "eyelash" // アイラッシュ
  | "relax" // リラクサロン
  | "esthetic" // エステサロン
  | "osteopathy"; // 整体院

export const CATEGORY_LABEL: Record<SalonCategory, string> = {
  hair: "ヘアサロン",
  nail: "ネイルサロン",
  eyelash: "アイラッシュ",
  relax: "リラクサロン",
  esthetic: "エステサロン",
  osteopathy: "整体院",
};

export interface Brand {
  id: string;
  name: string;
  nameEn: string;
  category: SalonCategory;
  /** Chart / accent colour (hex). */
  color: string;
}

export type StoreStatus = "open" | "renovation" | "opening" | "closing";

export interface Store {
  id: string;
  name: string;
  brandId: string;
  area: string;
  prefecture: string;
  openedYear: number;
  staff: number;
  seats: number;
  status: StoreStatus;
  manager: string;
}

export type PaymentMethodKey =
  | "cash" // 現金
  | "credit" // クレジットカード
  | "qr" // QRコード決済
  | "emoney" // 電子マネー
  | "subscription" // サブスク（定額）
  | "prepaid"; // 前受金（回数券・コース・役務）

export const PAYMENT_LABEL: Record<PaymentMethodKey, string> = {
  cash: "現金",
  credit: "クレジットカード",
  qr: "QRコード決済",
  emoney: "電子マネー",
  subscription: "サブスク",
  prepaid: "回数券・前受金",
};

export interface Processor {
  id: string;
  name: string;
  method: PaymentMethodKey;
  /** Settlement fee, fraction (e.g. 0.0325). */
  feeRate: number;
  /** Human-readable payout cycle, e.g. "翌営業日" / "月2回 (15日/末日締)". */
  cycleLabel: string;
}

// ---- Canonical monthly fact, per store ------------------------------------

export interface StoreMonth {
  storeId: string;
  brandId: string;
  /** "YYYY-MM" */
  ym: string;
  revenueTech: number; // 技術売上
  revenueProduct: number; // 店販売上
  revenueSubscription: number; // サブスク売上
  revenueOther: number; // その他売上
  customers: number; // 来店客数
  newCustomers: number; // 新規客数
  reservations: number; // 予約数
  cancellations: number; // キャンセル数
  noShows: number; // 無断キャンセル数
  cogs: number; // 売上原価（材料費）
  cost: {
    labor: number; // 人件費
    rent: number; // 地代家賃
    utilities: number; // 水道光熱費
    advertising: number; // 広告宣伝費
    paymentFees: number; // 支払手数料
    depreciation: number; // 減価償却費
    other: number; // その他経費
  };
}

export type ExpenseKey = keyof StoreMonth["cost"] | "cogs";

export const EXPENSE_LABEL: Record<ExpenseKey, string> = {
  cogs: "売上原価（材料費）",
  labor: "人件費",
  rent: "地代家賃",
  utilities: "水道光熱費",
  advertising: "広告宣伝費",
  paymentFees: "支払手数料",
  depreciation: "減価償却費",
  other: "その他経費",
};

// ---- Cash & settlement ----------------------------------------------------

export type SettlementStatus = "scheduled" | "paid" | "delayed";

export interface Settlement {
  id: string;
  processorId: string;
  method: PaymentMethodKey;
  /** Gross sales captured for this payout. */
  gross: number;
  fee: number;
  net: number;
  /** ISO date the payout is expected / was received. */
  date: string;
  status: SettlementStatus;
  storeId: string;
}

export type ReconStatus = "matched" | "investigating" | "unmatched";

export interface ReconItem {
  id: string;
  date: string;
  storeId: string;
  method: PaymentMethodKey;
  processorId: string;
  /** Amount Salon One recorded as sales. */
  recorded: number;
  /** Amount actually deposited / counted. */
  settled: number;
  status: ReconStatus;
  note: string;
}

// ---- Marketing ------------------------------------------------------------

export type ChannelKind = "paid" | "owned" | "referral" | "organic";

export interface MarketingChannel {
  id: string;
  name: string;
  kind: ChannelKind;
}

// ---- Shared small shapes used by selectors --------------------------------

export interface SeriesPoint {
  label: string;
  value: number;
  [k: string]: string | number;
}

export interface Kpi {
  key: string;
  label: string;
  value: number;
  /** Year-over-year (or vs comparison) change as a fraction. */
  delta: number;
  /** How to format the value. */
  format: "yen" | "yenCompact" | "number" | "percent" | "decimal";
  /** Optional trailing sparkline. */
  spark?: number[];
  hint?: string;
}
