import {
  BarChart3,
  Banknote,
  CalendarX,
  ClipboardList,
  Clock,
  FileText,
  Hand,
  HeartPulse,
  LayoutDashboard,
  Landmark,
  Megaphone,
  Network,
  Package,
  Repeat,
  Scissors,
  Scale,
  Settings,
  Store,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Short description for tooltips / command palette. */
  desc?: string;
}

// ---- Role-based access (demo of RBAC; real enforcement is server-side) ----
export type Role = "owner" | "area" | "finance" | "viewer";

export const ROLES: { key: Role; label: string; desc: string }[] = [
  { key: "owner", label: "経営者", desc: "全権限" },
  { key: "area", label: "エリアマネージャー", desc: "分析・店舗" },
  { key: "finance", label: "経理・財務", desc: "資金・財務・レポート" },
  { key: "viewer", label: "閲覧（税理士）", desc: "財務・レポートの閲覧" },
];

const ACCESS: Record<Role, string[] | "all"> = {
  owner: "all",
  area: ["/", "/budget", "/sales", "/customers", "/marketing", "/stores", "/inventory", "/cancellations", "/labor", "/franchise", "/courses", "/insurance", "/stylists", "/membership", "/relax"],
  finance: ["/", "/budget", "/cashflow", "/reconciliation", "/financials", "/reports", "/settings", "/inventory", "/cancellations", "/labor", "/funding", "/franchise", "/courses", "/insurance", "/stylists", "/membership", "/relax"],
  viewer: ["/", "/financials", "/reports"],
};

export function canAccess(role: Role, href: string): boolean {
  const a = ACCESS[role];
  return a === "all" || a.includes(href);
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    label: "経営概況",
    items: [
      { href: "/", label: "ダッシュボード", icon: LayoutDashboard, desc: "全社KPIと要対応事項" },
      { href: "/budget", label: "予実・目標", icon: Target, desc: "業態別の予算・目標と実績管理" },
    ],
  },
  {
    label: "分析",
    items: [
      { href: "/sales", label: "売上・実績", icon: BarChart3, desc: "ブランド/店舗/スタッフ/メニュー" },
      { href: "/customers", label: "顧客分析", icon: Users, desc: "LTV・リピート・RFM・サブスク" },
      { href: "/marketing", label: "マーケティング", icon: Megaphone, desc: "媒体別ROI・CPA・集客" },
    ],
  },
  {
    label: "財務・資金",
    items: [
      { href: "/cashflow", label: "資金繰り", icon: Wallet, desc: "現金・決済別入金・前受金" },
      { href: "/reconciliation", label: "入金・突合", icon: Scale, desc: "売上と入金の差異管理" },
      { href: "/financials", label: "財務・PL", icon: Landmark, desc: "損益計算書・損益分岐点" },
      { href: "/funding", label: "資金調達・税務", icon: Banknote, desc: "借入・返済予定・補助金・消費税" },
    ],
  },
  {
    label: "運営",
    items: [
      { href: "/inventory", label: "在庫・発注", icon: Package, desc: "材料/店販在庫・発注点・ロス管理" },
      { href: "/cancellations", label: "キャンセル料", icon: CalendarX, desc: "無断/直前キャンセルの請求・回収・常習者" },
      { href: "/labor", label: "人時生産性・シフト", icon: Clock, desc: "生産性・適正人員・需要予測・歩合" },
    ],
  },
  {
    label: "業態別",
    items: [
      { href: "/courses", label: "役務・コース（エステ）", icon: ClipboardList, desc: "前受金・消化・中途解約・信販" },
      { href: "/insurance", label: "保険診療・療養費（整体）", icon: HeartPulse, desc: "保険/自費区分・療養費・返戻・入金遅延" },
      { href: "/stylists", label: "スタイリスト・歩合（ヘア）", icon: Scissors, desc: "指名・ランク別歩合・面貸し/委託" },
      { href: "/membership", label: "定額制・回転（ネイル/アイラッシュ）", icon: Repeat, desc: "通い放題・回転率・リペア" },
      { href: "/relax", label: "施術・委託（リラク）", icon: Hand, desc: "資格区分・分単位・委託分配" },
    ],
  },
  {
    label: "店舗・レポート",
    items: [
      { href: "/stores", label: "店舗管理", icon: Store, desc: "多店舗・多ブランド比較" },
      { href: "/franchise", label: "FC・のれん分け", icon: Network, desc: "加盟店別PL・ロイヤリティ" },
      { href: "/reports", label: "レポート出力", icon: FileText, desc: "月次資料・税理士提出資料" },
      { href: "/settings", label: "設定・連携", icon: Settings, desc: "Salon One 連携設定" },
    ],
  },
];

const TITLE_MAP: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items).map((i) => [i.href, i.label]),
);

export function routeTitle(pathname: string): string {
  if (TITLE_MAP[pathname]) return TITLE_MAP[pathname];
  // longest-prefix match for nested routes (e.g. /stores/[id])
  const match = Object.keys(TITLE_MAP)
    .filter((h) => h !== "/" && pathname.startsWith(h))
    .sort((a, b) => b.length - a.length)[0];
  return match ? TITLE_MAP[match] : "ダッシュボード";
}
