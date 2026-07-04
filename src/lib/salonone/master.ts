// ============================================================
// Salon One master-data sync (phase 1).
// ------------------------------------------------------------
// Pulls the real brand / shop / staff masters and maps them onto the
// dashboard's Brand / Store domain types. Salon One does not carry a
// salon-category field, so the category is inferred from names (keyword
// heuristics) — it only drives demo-number generation and menu labels
// until phase 2 replaces the numbers with real aggregates.
// ============================================================

import type { Brand, SalonCategory, Store } from "@/lib/types";
import { apiGet } from "./client";
import type { SalonOneBrand, SalonOneShop, SalonOneStaff } from "./types";

export interface StaffLite {
  id: string;
  name: string;
}

export interface MasterData {
  brands: Brand[];
  stores: Store[];
  /** Real staff per store (dashboard store id → staff), for name display. */
  staffByStore: Record<string, StaffLite[]>;
  fetchedAt: string;
}

// Brand accent palette (stable by brand order).
const BRAND_COLORS = [
  "#0f766e", "#be185d", "#7c3aed", "#2563eb", "#0891b2", "#b45309",
  "#dc2626", "#059669", "#9333ea", "#ca8a04", "#0ea5e9", "#e11d48",
];

// Ordered keyword rules — first hit wins (整体 outranks 小顔/エステ so that
// "小顔整体サロン…" lands on osteopathy).
const CATEGORY_RULES: [SalonCategory, RegExp][] = [
  ["osteopathy", /整体|接骨|骨盤|矯正|鍼|カイロ|院$/],
  ["nail", /ネイル|nail/i],
  ["eyelash", /まつ|マツ|ラッシュ|lash|アイブロウ|眉|アイリスト/i],
  ["hair", /ヘア|hair|美容室|美容院|バーバー|barber/i],
  ["relax", /リラク|もみ|揉み|ほぐし|マッサージ|スパ|spa/i],
  ["esthetic", /エステ|脱毛|痩身|フェイシャル|小顔|美肌|beauty/i],
];

function inferCategory(texts: string[]): SalonCategory {
  for (const [category, re] of CATEGORY_RULES) {
    if (texts.some((t) => re.test(t))) return category;
  }
  return "esthetic"; // neutral default for unknown salon types
}

const PREF_RE = /(東京都|北海道|京都府|大阪府|[一-龠ぁ-んァ-ン]{2,3}県)/;

function looksLikeTest(name: string): boolean {
  return /テスト|\[?test\]?|検証/i.test(name);
}

/** Dashboard-side ids are prefixed strings so they never collide with mock ids. */
export const brandIdOf = (b: SalonOneBrand) => `b${b.id}`;
export const shopIdOf = (s: SalonOneShop) => `s${s.id}`;

export async function fetchMasterData(): Promise<MasterData> {
  const [rawBrands, rawShops, rawStaffs] = await Promise.all([
    apiGet<SalonOneBrand[]>("/api/brands"),
    apiGet<SalonOneShop[]>("/api/shops"),
    apiGet<SalonOneStaff[]>("/api/staffs"),
  ]);

  const includeTest = process.env.SALONONE_INCLUDE_TEST === "1";
  const keepBrand = (b: SalonOneBrand) => !b.deleted_at && (includeTest || !looksLikeTest(b.name));
  const keepShop = (s: SalonOneShop) => !s.deleted_at && (includeTest || !looksLikeTest(s.name));

  const brandsSrc = rawBrands.filter(keepBrand);
  const brandIds = new Set(brandsSrc.map((b) => b.id));
  const shopsSrc = rawShops.filter((s) => keepShop(s) && brandIds.has(s.brand_id));

  // staff grouped by real shop id (public, not deleted)
  const staffByShopId = new Map<number, SalonOneStaff[]>();
  for (const st of rawStaffs) {
    if (st.deleted_at) continue;
    const list = staffByShopId.get(st.shop_id) ?? [];
    list.push(st);
    staffByShopId.set(st.shop_id, list);
  }

  const brands: Brand[] = brandsSrc.map((b, i) => {
    const shopNames = shopsSrc.filter((s) => s.brand_id === b.id).map((s) => s.name);
    return {
      id: brandIdOf(b),
      name: b.name,
      nameEn: b.code || b.name,
      category: inferCategory([b.name, ...shopNames]),
      color: BRAND_COLORS[i % BRAND_COLORS.length],
    };
  });

  const staffByStore: Record<string, StaffLite[]> = {};
  const stores: Store[] = shopsSrc.map((s) => {
    const staffs = (staffByShopId.get(s.id) ?? []).sort((a, b) => a.allocate_order - b.allocate_order);
    const storeId = shopIdOf(s);
    staffByStore[storeId] = staffs.map((st) => ({ id: `st${st.id}`, name: st.name }));
    const prefecture = s.address?.match(PREF_RE)?.[1] ?? "—";
    return {
      id: storeId,
      name: s.name,
      brandId: `b${s.brand_id}`,
      area: s.name_en || s.name,
      prefecture,
      openedYear: new Date(s.created_at).getFullYear(),
      staff: Math.max(1, staffs.length),
      seats: Math.max(1, s.scale || 1),
      status: s.is_public ? "open" : "renovation",
      manager: staffs[0]?.name ?? "—",
    };
  });

  return { brands, stores, staffByStore, fetchedAt: new Date().toISOString() };
}
