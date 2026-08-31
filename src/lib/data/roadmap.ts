// 開発ロードマップの初期データ。
// 運用中のスプレッドシート「中長期開発スケジュール」をそのまま移植したもの。
// 画面上の編集はブラウザに保存され、ここが常に「元の計画」になる。
//
// スプレッドシートの表記との対応は src/lib/roadmap.ts の DEV_STATUS を参照。
//   8/31 → 2026-08-31 週（週次MTGが月曜のため、日付はすべて月曜日）

import type { DevItem } from "@/lib/roadmap";

const W = {
  w0831: "2026-08-31",
  w0907: "2026-09-07",
  w0914: "2026-09-14",
  w0921: "2026-09-21",
  w0928: "2026-09-28",
} as const;

export const ROADMAP_ITEMS: DevItem[] = [
  // ---- 着手済み（今週） ----
  {
    id: "auth",
    title: "認証・権限管理",
    category: "base",
    priority: 5,
    status: "inProgress",
    week: W.w0831,
  },
  {
    id: "sales-customer-analytics",
    title: "売上分析・顧客分析",
    category: "analytics",
    priority: 5,
    status: "inProgress",
    week: W.w0831,
  },

  // ---- 着手予定 ----
  {
    id: "attendance",
    title: "勤怠管理",
    category: "hr",
    priority: 5,
    status: "planned",
    week: W.w0907,
  },
  {
    id: "e-karte",
    title: "電子カルテ",
    category: "crm",
    priority: 5,
    status: "planned",
    week: W.w0907,
  },
  {
    id: "force-link",
    no: 143,
    refs: [156, 138, 165, 125, 141],
    title: "強制リンク",
    note: "予約の○を赤◎に",
    category: "base",
    priority: 5,
    status: "planned",
    week: W.w0907,
  },
  {
    id: "retiree",
    title: "退職者管理",
    category: "hr",
    priority: 3,
    status: "planned",
    week: W.w0914,
  },
  {
    id: "cancel-fee",
    title: "キャンセル料請求",
    category: "base",
    priority: 5,
    status: "planned",
    week: W.w0914,
  },
  {
    id: "sms",
    title: "SMS連携",
    category: "integration",
    priority: 5,
    status: "planned",
    week: W.w0914,
  },
  {
    id: "ad-cpa",
    title: "広告・CPA分析【クリエイティブ】",
    category: "analytics",
    priority: 5,
    status: "planned",
    week: W.w0921,
  },
  {
    id: "hpb-sync",
    title: "HPBダブル同期",
    category: "integration",
    priority: 4,
    status: "planned",
    week: W.w0921,
  },
  {
    id: "qa",
    title: "Q&A",
    category: "base",
    priority: 5,
    status: "planned",
    week: W.w0928,
  },

  // ---- 別途対応（スプレッドシート上は取り消し線） ----
  {
    id: "expense",
    title: "経費管理",
    note: "酒井モック",
    category: "accounting",
    priority: 3,
    status: "excluded",
  },
  {
    id: "payroll",
    title: "給与計算",
    note: "酒井モック",
    category: "hr",
    priority: 5,
    status: "excluded",
  },

  // ---- 次候補（☆・日程未定） ----
  {
    id: "ai-suggestion",
    title: "AI改善提案",
    category: "ai",
    priority: 4,
    status: "next",
  },
  {
    id: "accounting-link",
    title: "会計ソフト連携",
    category: "integration",
    priority: 3,
    status: "next",
  },
  {
    id: "force-link-ux",
    title: "強制リンクUX改善",
    category: "base",
    priority: 5,
    status: "next",
  },

  // ---- 中長期（空欄） ----
  {
    id: "e-consent",
    title: "電子同意書",
    category: "contract",
    priority: 5,
    status: "later",
  },
  {
    id: "e-contract",
    title: "電子契約書",
    category: "contract",
    priority: 4,
    status: "later",
  },
  {
    id: "ai-dashboard",
    title: "AI経営ダッシュボード",
    category: "ai",
    priority: 4,
    status: "later",
  },
  {
    id: "fc-hq",
    title: "FC本部管理",
    category: "hq",
    priority: 4,
    status: "later",
  },
];
