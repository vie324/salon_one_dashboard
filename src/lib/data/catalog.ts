// Static catalog (masters) for the demo company "Salon One Holdings".
// Multi-brand, multi-store, covering all six salon categories.

import type {
  Brand,
  MarketingChannel,
  PaymentMethodKey,
  Processor,
  SalonCategory,
  Store,
} from "@/lib/types";

export const COMPANY = {
  name: "Salon One Holdings",
  nameJa: "株式会社サロンワン・ホールディングス",
  fiscalYearStartMonth: 4,
};

export const BRANDS: Brand[] = [
  { id: "lumiere", name: "Lumière", nameEn: "Lumiere", category: "hair", color: "#6366f1" },
  { id: "mods", name: "MOD's Nail", nameEn: "MODs Nail", category: "nail", color: "#ec4899" },
  { id: "lashe", name: "Lashé", nameEn: "Lashe", category: "eyelash", color: "#a855f7" },
  { id: "karada", name: "Karada Lab", nameEn: "Karada Lab", category: "osteopathy", color: "#0ea5e9" },
  { id: "reposer", name: "Reposer", nameEn: "Reposer", category: "relax", color: "#14b8a6" },
  { id: "blanc", name: "Esthé Blanc", nameEn: "Esthe Blanc", category: "esthetic", color: "#f59e0b" },
];

export function brandById(id: string): Brand | undefined {
  return BRANDS.find((b) => b.id === id);
}

interface StoreSeed {
  brandId: string;
  area: string;
  prefecture: string;
  openedYear: number;
  staff: number;
  seats: number;
  status?: Store["status"];
  manager: string;
}

const STORE_SEEDS: StoreSeed[] = [
  // Lumière (hair)
  { brandId: "lumiere", area: "表参道", prefecture: "東京都", openedYear: 2016, staff: 18, seats: 14, manager: "佐藤 美咲" },
  { brandId: "lumiere", area: "渋谷", prefecture: "東京都", openedYear: 2018, staff: 15, seats: 12, manager: "高橋 蓮" },
  { brandId: "lumiere", area: "横浜", prefecture: "神奈川県", openedYear: 2019, staff: 12, seats: 10, manager: "渡辺 さくら" },
  { brandId: "lumiere", area: "大阪梅田", prefecture: "大阪府", openedYear: 2020, staff: 14, seats: 12, manager: "山本 大輔" },
  { brandId: "lumiere", area: "名古屋栄", prefecture: "愛知県", openedYear: 2022, staff: 10, seats: 9, manager: "中村 結衣" },
  // MOD's Nail (nail)
  { brandId: "mods", area: "銀座", prefecture: "東京都", openedYear: 2017, staff: 11, seats: 10, manager: "小林 由佳" },
  { brandId: "mods", area: "新宿", prefecture: "東京都", openedYear: 2019, staff: 9, seats: 8, manager: "加藤 玲奈" },
  { brandId: "mods", area: "福岡天神", prefecture: "福岡県", openedYear: 2023, staff: 7, seats: 7, status: "opening", manager: "吉田 彩花" },
  // Lashé (eyelash)
  { brandId: "lashe", area: "渋谷", prefecture: "東京都", openedYear: 2018, staff: 10, seats: 9, manager: "松本 もえ" },
  { brandId: "lashe", area: "大宮", prefecture: "埼玉県", openedYear: 2021, staff: 7, seats: 7, manager: "井上 ひかり" },
  // Karada Lab (osteopathy)
  { brandId: "karada", area: "新宿", prefecture: "東京都", openedYear: 2019, staff: 9, seats: 8, manager: "木村 翔太" },
  { brandId: "karada", area: "横浜", prefecture: "神奈川県", openedYear: 2021, staff: 7, seats: 6, status: "renovation", manager: "林 健一" },
  // Reposer (relax)
  { brandId: "reposer", area: "銀座", prefecture: "東京都", openedYear: 2018, staff: 12, seats: 12, manager: "斎藤 真理" },
  { brandId: "reposer", area: "心斎橋", prefecture: "大阪府", openedYear: 2022, staff: 8, seats: 9, manager: "清水 杏" },
  // Esthé Blanc (esthetic)
  { brandId: "blanc", area: "表参道", prefecture: "東京都", openedYear: 2017, staff: 13, seats: 8, manager: "森 麻衣" },
  { brandId: "blanc", area: "神戸三宮", prefecture: "兵庫県", openedYear: 2020, staff: 9, seats: 6, manager: "池田 奈緒" },
];

export const STORES: Store[] = STORE_SEEDS.map((s) => {
  const brand = brandById(s.brandId)!;
  return {
    id: `${s.brandId}-${romaji(s.area)}`,
    name: `${brand.name} ${s.area}店`,
    brandId: s.brandId,
    area: s.area,
    prefecture: s.prefecture,
    openedYear: s.openedYear,
    staff: s.staff,
    seats: s.seats,
    status: s.status ?? "open",
    manager: s.manager,
  };
});

export function storeById(id: string): Store | undefined {
  return STORES.find((s) => s.id === id);
}

export function storesForFilter(brandId: string): Store[] {
  return brandId === "all"
    ? STORES
    : STORES.filter((s) => s.brandId === brandId);
}

// ---- Payment processors / settlement partners ----------------------------

export const PROCESSORS: Processor[] = [
  { id: "cash", name: "現金（店舗レジ）", method: "cash", feeRate: 0, cycleLabel: "即時" },
  { id: "square", name: "Square", method: "credit", feeRate: 0.0325, cycleLabel: "翌営業日入金" },
  { id: "stripe", name: "Stripe", method: "credit", feeRate: 0.036, cycleLabel: "週次（金曜入金）" },
  { id: "paypay", name: "PayPay", method: "qr", feeRate: 0.0198, cycleLabel: "月次（末締・翌月入金）" },
  { id: "rakuten", name: "楽天ペイ", method: "qr", feeRate: 0.0324, cycleLabel: "月2回（15日/末締）" },
  { id: "emoney", name: "交通系IC / iD / QUICPay", method: "emoney", feeRate: 0.0295, cycleLabel: "月次" },
  { id: "submethod", name: "サブスク決済（口座振替）", method: "subscription", feeRate: 0.029, cycleLabel: "月次（毎月10日）" },
  { id: "prepaid", name: "前受金消化（回数券・コース）", method: "prepaid", feeRate: 0, cycleLabel: "役務提供時に計上" },
];

export function processorById(id: string): Processor | undefined {
  return PROCESSORS.find((p) => p.id === id);
}

/** Primary processor used for a given payment method (for settlement). */
export function processorForMethod(method: PaymentMethodKey): Processor {
  return PROCESSORS.find((p) => p.method === method) ?? PROCESSORS[0];
}

// ---- Marketing channels --------------------------------------------------

export const CHANNELS: MarketingChannel[] = [
  { id: "hotpepper", name: "ホットペッパービューティー", kind: "paid" },
  { id: "minimo", name: "minimo", kind: "paid" },
  { id: "instagram", name: "Instagram", kind: "owned" },
  { id: "line", name: "LINE公式", kind: "owned" },
  { id: "google", name: "Google（MEO/検索）", kind: "organic" },
  { id: "referral", name: "ご紹介", kind: "referral" },
  { id: "web", name: "自社サイト", kind: "owned" },
];

// ---- Per-category economic profile (drives generation) -------------------

export interface CategoryProfile {
  ticket: number; // 客単価ベース
  custPerStore: number; // 月間来店客数ベース/店
  productRatio: number; // 店販売上比率
  subRatio: number; // サブスク売上比率
  repeat: number; // リピート率
  cancelRate: number;
  cogsRatio: number; // 材料費率
  laborRatio: number;
  rentRatio: number;
  adRatio: number;
}

export const CATEGORY_PROFILE: Record<SalonCategory, CategoryProfile> = {
  hair: { ticket: 7200, custPerStore: 880, productRatio: 0.12, subRatio: 0.03, repeat: 0.68, cancelRate: 0.05, cogsRatio: 0.1, laborRatio: 0.3, rentRatio: 0.12, adRatio: 0.05 },
  nail: { ticket: 8600, custPerStore: 520, productRatio: 0.04, subRatio: 0.05, repeat: 0.73, cancelRate: 0.05, cogsRatio: 0.12, laborRatio: 0.34, rentRatio: 0.12, adRatio: 0.05 },
  eyelash: { ticket: 6600, custPerStore: 600, productRatio: 0.03, subRatio: 0.18, repeat: 0.76, cancelRate: 0.05, cogsRatio: 0.09, laborRatio: 0.33, rentRatio: 0.12, adRatio: 0.05 },
  relax: { ticket: 6100, custPerStore: 700, productRatio: 0.05, subRatio: 0.05, repeat: 0.61, cancelRate: 0.06, cogsRatio: 0.04, laborRatio: 0.36, rentRatio: 0.14, adRatio: 0.06 },
  osteopathy: { ticket: 5600, custPerStore: 760, productRatio: 0.03, subRatio: 0.04, repeat: 0.66, cancelRate: 0.05, cogsRatio: 0.03, laborRatio: 0.35, rentRatio: 0.13, adRatio: 0.05 },
  esthetic: { ticket: 22000, custPerStore: 250, productRatio: 0.1, subRatio: 0.07, repeat: 0.71, cancelRate: 0.04, cogsRatio: 0.12, laborRatio: 0.28, rentRatio: 0.15, adRatio: 0.08 },
};

/** Payment-method mix by category (fractions, sum≈1). */
export const PAYMENT_MIX: Record<SalonCategory, Record<PaymentMethodKey, number>> = {
  hair: { cash: 0.18, credit: 0.42, qr: 0.16, emoney: 0.1, subscription: 0.04, prepaid: 0.1 },
  nail: { cash: 0.22, credit: 0.4, qr: 0.18, emoney: 0.08, subscription: 0.06, prepaid: 0.06 },
  eyelash: { cash: 0.16, credit: 0.34, qr: 0.14, emoney: 0.08, subscription: 0.2, prepaid: 0.08 },
  relax: { cash: 0.28, credit: 0.3, qr: 0.14, emoney: 0.08, subscription: 0.06, prepaid: 0.14 },
  osteopathy: { cash: 0.3, credit: 0.28, qr: 0.12, emoney: 0.08, subscription: 0.04, prepaid: 0.18 },
  esthetic: { cash: 0.1, credit: 0.3, qr: 0.08, emoney: 0.04, subscription: 0.08, prepaid: 0.4 },
};

/** Top menu groups per category — used for the sales-mix breakdown. */
export const MENU_GROUPS: Record<SalonCategory, string[]> = {
  hair: ["カット", "カラー", "パーマ", "トリートメント", "ヘッドスパ", "店販"],
  nail: ["ジェルネイル", "ケア", "アート", "フットネイル", "店販"],
  eyelash: ["まつげエクステ", "ラッシュリフト", "アイブロウ", "店販"],
  relax: ["全身もみほぐし", "リフレクソロジー", "アロマトリートメント", "ストレッチ"],
  osteopathy: ["整体・矯正", "骨盤矯正", "鍼灸", "自費リハビリ"],
  esthetic: ["フェイシャル", "ボディ・痩身", "脱毛", "コース消化", "店販"],
};

export const STAFF_NAMES = [
  "佐藤 さくら", "鈴木 蓮", "高橋 凛", "田中 大翔", "渡辺 結衣", "伊藤 陽葵",
  "山本 樹", "中村 葵", "小林 湊", "加藤 芽依", "吉田 颯", "山田 莉子",
  "佐々木 律", "山口 杏", "松本 悠真", "井上 紬", "木村 朝陽", "林 心春",
  "斎藤 暖", "清水 ひなた", "森 奏太", "池田 美羽", "橋本 新", "石川 咲良",
];

// ---- helpers -------------------------------------------------------------

function romaji(area: string): string {
  const map: Record<string, string> = {
    表参道: "omotesando", 渋谷: "shibuya", 横浜: "yokohama", 大阪梅田: "umeda",
    名古屋栄: "sakae", 銀座: "ginza", 新宿: "shinjuku", 福岡天神: "tenjin",
    大宮: "omiya", 心斎橋: "shinsaibashi", 神戸三宮: "sannomiya",
  };
  return map[area] ?? area;
}
