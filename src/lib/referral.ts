// ============================================================
// 紹介制度（リファラル）— 制度パラメータと特典の計算
// ------------------------------------------------------------
// 制度設計
//   ・紹介した側　 : 初期費用の 25% をお支払い（キャッシュバック）
//   ・紹介された側 : 初月の端数日数（利用開始日〜月末の日割り分）＋ 2ヶ月無料
//
// 金額・料率をここ 1 箇所に集約しています。条件を変更する場合は
// REFERRAL_PROGRAM を書き換えれば、フォーム・管理画面・API のすべてに反映されます。
// ============================================================

import type {
  ContactMethod,
  ContactSlot,
  ReferralLead,
  ReferralStatus,
  SalonCategory,
  StartPlan,
} from "@/lib/types";

export const REFERRAL_PROGRAM = {
  /** 紹介した側へお支払いする割合（初期費用に対して）。 */
  rewardRate: 0.25,
  /** 紹介された側に付与する無料月数。 */
  freeMonths: 2,
  /** 初月の端数日数（利用開始日〜その月末）も無料にするか。 */
  freeFirstMonthRemainder: true,
  /** 報酬のお支払い時期の案内文。 */
  rewardTiming: "成約（初期費用のご入金確認）の翌月末",
  /** 公開フォームのパス。管理画面での案内・コピーに使用します。 */
  formPath: "/referral/apply",
} as const;

/**
 * 料金の仮置き（デモ用）。**実際の Salon One の料金表に差し替えてください。**
 * 紹介報酬（初期費用の 25%）と無料期間の相当額を試算するためだけに使用します。
 */
export const FEE_ASSUMPTION = {
  initialFee: 200_000,
  monthlyFee: 29_800,
  /** 店舗数から初期費用・月額の目安を返します。 */
  byStoreCount(stores: number): { initialFee: number; monthlyFee: number } {
    if (stores >= 5) return { initialFee: 450_000, monthlyFee: 69_800 };
    if (stores >= 2) return { initialFee: 280_000, monthlyFee: 44_800 };
    return { initialFee: 150_000, monthlyFee: 29_800 };
  },
} as const;

/** 紹介報酬 = 初期費用 × 25%。 */
export function referrerReward(initialFee: number): number {
  return Math.round(initialFee * REFERRAL_PROGRAM.rewardRate);
}

// ---- 無料期間の計算 --------------------------------------------------------

export interface FreePeriod {
  /** 利用開始日 "YYYY-MM-DD"。 */
  start: string;
  /** 初月の端数日数（開始日〜月末、開始日を含む）。 */
  remainderDays: number;
  /** 初月の日数（日割りの分母）。 */
  daysInStartMonth: number;
  /** 無料月数（＝ 2ヶ月）。 */
  freeMonths: number;
  /** 無料期間の最終日 "YYYY-MM-DD"。 */
  freeUntil: string;
  /** 初回課金の開始日 "YYYY-MM-DD"。 */
  billingStart: string;
  /** 無料になる合計日数（端数日数＋無料月の日数）。 */
  totalFreeDays: number;
}

function ymd(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m, d];
}

/** 月の日数（m は 1 始まり）。UTC 固定でタイムゾーンの影響を受けません。 */
export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 月を加算（m は 1 始まり）。 */
function addMonths(y: number, m: number, add: number): [number, number] {
  const idx = y * 12 + (m - 1) + add;
  return [Math.floor(idx / 12), (idx % 12) + 1];
}

/**
 * 利用開始日から無料期間を算出します。
 * 例）7/10 開始・2ヶ月無料 → 7/10〜7/31（端数 22 日）＋ 8月・9月 が無料、初回課金は 10/1。
 */
export function freePeriod(
  start: string,
  freeMonths: number = REFERRAL_PROGRAM.freeMonths,
): FreePeriod {
  const [y, m, d] = ymd(start);
  const dim = daysInMonth(y, m);
  const remainderDays = REFERRAL_PROGRAM.freeFirstMonthRemainder ? dim - d + 1 : 0;

  // 無料になる最後の月（端数月の freeMonths ヶ月後）
  const [ey, em] = addMonths(y, m, freeMonths);
  const freeUntil = toIso(ey, em, daysInMonth(ey, em));
  const [by, bm] = addMonths(y, m, freeMonths + 1);
  const billingStart = toIso(by, bm, 1);

  let monthDays = 0;
  for (let i = 1; i <= freeMonths; i++) {
    const [fy, fm] = addMonths(y, m, i);
    monthDays += daysInMonth(fy, fm);
  }

  return {
    start,
    remainderDays,
    daysInStartMonth: dim,
    freeMonths,
    freeUntil,
    billingStart,
    totalFreeDays: remainderDays + monthDays,
  };
}

/** 無料期間の相当額（月額 × 無料月数 ＋ 初月の日割り分）。 */
export function freePeriodValue(monthlyFee: number, p: FreePeriod): number {
  const remainder = (monthlyFee * p.remainderDays) / p.daysInStartMonth;
  return Math.round(monthlyFee * p.freeMonths + remainder);
}

// ---- フォームの選択肢 ------------------------------------------------------

export const CONTACT_METHOD_OPTIONS: { key: ContactMethod; label: string; hint: string }[] = [
  { key: "phone", label: "電話", hint: "ご希望の時間帯にお電話します" },
  { key: "email", label: "メール", hint: "資料とあわせてご返信します" },
  { key: "line", label: "LINE", hint: "LINE でやり取りします" },
  { key: "sms", label: "SMS", hint: "ショートメールでご連絡します" },
  { key: "online", label: "オンライン面談", hint: "Zoom 等のURLをお送りします" },
];

export const CONTACT_SLOT_OPTIONS: { key: ContactSlot; label: string }[] = [
  { key: "am", label: "午前（10:00〜12:00）" },
  { key: "noon", label: "昼（12:00〜15:00）" },
  { key: "pm", label: "午後（15:00〜18:00）" },
  { key: "evening", label: "夕方以降（18:00〜21:00）" },
  { key: "anytime", label: "いつでも可" },
];

export const START_PLAN_OPTIONS: { key: StartPlan; label: string }[] = [
  { key: "asap", label: "できるだけ早く" },
  { key: "within1m", label: "1ヶ月以内" },
  { key: "within3m", label: "2〜3ヶ月以内" },
  { key: "undecided", label: "未定・情報収集中" },
];

export const STATUS_TONE: Record<ReferralStatus, "warning" | "info" | "brand" | "success" | "neutral"> = {
  new: "warning",
  contacted: "info",
  appointment: "brand",
  won: "success",
  lost: "neutral",
};

/** ステータスの表示色（グラフ・バー用）。 */
export const STATUS_COLOR: Record<ReferralStatus, string> = {
  new: "#d97706", // amber — 要対応
  contacted: "#0284c7", // sky
  appointment: "#0f766e", // brand teal
  won: "#16a34a", // green
  lost: "#94a3b8", // slate
};

// ---- フォームの値とバリデーション ------------------------------------------

export interface ReferralFormValues {
  // 誰に紹介されたか
  referrerName: string;
  referrerSalon: string;
  referrerCode: string;
  // 申込者
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  lineId: string;
  storeCount: string;
  categories: SalonCategory[];
  // ご連絡について
  contactMethod: ContactMethod | "";
  preferredDate1: string;
  preferredSlot1: ContactSlot | "";
  preferredDate2: string;
  preferredSlot2: ContactSlot | "";
  startPlan: StartPlan | "";
  startDate: string;
  note: string;
  consent: boolean;
}

export const EMPTY_FORM: ReferralFormValues = {
  referrerName: "",
  referrerSalon: "",
  referrerCode: "",
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  lineId: "",
  storeCount: "1",
  categories: [],
  contactMethod: "",
  preferredDate1: "",
  preferredSlot1: "",
  preferredDate2: "",
  preferredSlot2: "",
  startPlan: "",
  startDate: "",
  note: "",
  consent: false,
};

export type FormErrors = Partial<Record<keyof ReferralFormValues, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-() ]{9,20}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 入力チェック。クライアント（送信前）と API（受信時）の両方から呼び、
 * 同じルールで検証します。
 */
export function validateReferralForm(v: ReferralFormValues): FormErrors {
  const e: FormErrors = {};

  if (!v.referrerName.trim()) e.referrerName = "紹介者のお名前をご入力ください";
  if (!v.companyName.trim()) e.companyName = "サロン・会社名をご入力ください";
  if (!v.contactName.trim()) e.contactName = "ご担当者さまのお名前をご入力ください";

  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) e.email = "メールアドレスの形式をご確認ください";
  if (v.phone.trim() && !PHONE_RE.test(v.phone.trim())) e.phone = "電話番号の形式をご確認ください";

  if (!v.contactMethod) {
    e.contactMethod = "ご希望の連絡方法をお選びください";
  } else if ((v.contactMethod === "phone" || v.contactMethod === "sms") && !v.phone.trim()) {
    e.phone = "電話・SMS をご希望の場合は電話番号が必要です";
  } else if ((v.contactMethod === "email" || v.contactMethod === "online") && !v.email.trim()) {
    e.email = "メール・オンライン面談をご希望の場合はメールアドレスが必要です";
  } else if (v.contactMethod === "line" && !v.lineId.trim()) {
    e.lineId = "LINE をご希望の場合は LINE ID をご入力ください";
  }

  // 連絡手段にかかわらず、電話かメールのどちらかは必要
  if (!e.phone && !e.email && !v.phone.trim() && !v.email.trim()) {
    e.email = "電話番号かメールアドレスのいずれかをご入力ください";
  }

  if (!v.preferredDate1 || !ISO_DATE_RE.test(v.preferredDate1)) {
    e.preferredDate1 = "ご希望日（第1希望）をお選びください";
  }
  if (!v.preferredSlot1) e.preferredSlot1 = "ご希望の時間帯をお選びください";
  if (v.preferredDate2 && !ISO_DATE_RE.test(v.preferredDate2)) {
    e.preferredDate2 = "日付の形式をご確認ください";
  }
  if (v.preferredDate2 && !v.preferredSlot2) e.preferredSlot2 = "第2希望の時間帯をお選びください";
  if (v.startDate && !ISO_DATE_RE.test(v.startDate)) e.startDate = "日付の形式をご確認ください";
  if (!v.startPlan) e.startPlan = "ご利用開始のご希望時期をお選びください";

  const n = Number(v.storeCount);
  if (!Number.isFinite(n) || n < 1 || n > 999) e.storeCount = "店舗数は 1〜999 でご入力ください";

  if (!v.consent) e.consent = "個人情報の取り扱いについてご同意ください";

  return e;
}

export function hasErrors(e: FormErrors): boolean {
  return Object.keys(e).length > 0;
}

// ---- 個人情報のマスキング --------------------------------------------------

function maskName(name: string): string {
  const head = name.trim().charAt(0);
  return head ? `${head}◯◯` : "◯◯";
}

/**
 * 連絡先を伏せた申込。画面（サーバ側）は完全な値を参照しますが、
 * 公開 HTTP API から返す場合はこちらを通します。
 */
export function maskLead(lead: ReferralLead): ReferralLead {
  return {
    ...lead,
    contactName: maskName(lead.contactName),
    phone: undefined,
    email: undefined,
    lineId: undefined,
    note: undefined,
  };
}

// ---- 受付番号・日付ヘルパー ------------------------------------------------

/** ISO 日時 → 日本時間の "YYYY-MM-DD"（サーバ／クライアントで一致します）。 */
export function jstDate(isoDateTime: string): string {
  const d = new Date(isoDateTime);
  if (Number.isNaN(d.getTime())) return isoDateTime.slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(d);
}

/** 受付番号（例: RF-2609-0007）。 */
export function makeLeadId(isoDateTime: string, seq: number): string {
  const [y, m] = jstDate(isoDateTime).split("-");
  return `RF-${y.slice(2)}${m}-${String(seq).padStart(4, "0")}`;
}
