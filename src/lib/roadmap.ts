// ============================================================
// 開発ロードマップ — ドメインモデルとヘルパー
// ------------------------------------------------------------
// これまでスプレッドシートで管理していた「中長期の開発スケジュール」を
// システム内で扱うためのモデル。週（月曜始まり）を最小単位とし、
// 各項目は「開発進捗」台帳の No.（#143 など）で紐づける。
//
// 週次の開発MTGの運用に合わせた設計:
//   ・横軸 = 週（月 = 週の過半数が属する月。8/31週は「9月」に入る）
//   ・今週進める項目だけを前面に出し、日程未定の候補は畳んでおく
// ============================================================

/**
 * ロードマップの基準日。週次MTGが月曜のため、この日を含む週が「今週」。
 * 実データ連携時はサーバ側の現在日に差し替える（SSR/CSRのズレを避けるため
 * 画面側では new Date() を使わず、この値を起点にしている）。
 */
export const ROADMAP_TODAY = "2026-08-31";

/**
 * 1週あたりの推奨依頼件数。これを超えると「大量に依頼している」印象になるため、
 * 編集時に注意を出す（開発側の見え方を整えるためのガードレール）。
 */
export const WEEKLY_WIP_LIMIT = 3;

/** 画面の状態（No./週/ステータスの上書き）の保存先。 */
export const ROADMAP_STORAGE_KEY = "salonone.roadmap.v1";

// ---- カテゴリ -------------------------------------------------------------

export type DevCategory =
  | "base" // 基盤
  | "analytics" // 分析
  | "hr" // 人事
  | "crm" // CRM
  | "integration" // 外部連携
  | "accounting" // 会計
  | "ai" // AI
  | "contract" // 契約
  | "hq"; // 本部

export const DEV_CATEGORY: Record<DevCategory, { label: string; color: string }> = {
  base: { label: "基盤", color: "#0f766e" },
  analytics: { label: "分析", color: "#2563eb" },
  hr: { label: "人事", color: "#b45309" },
  crm: { label: "CRM", color: "#be185d" },
  integration: { label: "外部連携", color: "#0891b2" },
  accounting: { label: "会計", color: "#65a30d" },
  ai: { label: "AI", color: "#7c3aed" },
  contract: { label: "契約", color: "#475569" },
  hq: { label: "本部", color: "#c2410c" },
};

// ---- ステータス -----------------------------------------------------------
// スプレッドシートの表記との対応:
//   日付のみ（8/31）      → inProgress（着手済み）
//   ★付きの日付（★9/7）  → planned（着手予定）
//   ☆                    → next（次候補・日程未定）
//   空欄                  → later（中長期）
//   取り消し線            → excluded（このリストの対象外＝別途対応）

export type DevStatus = "done" | "inProgress" | "planned" | "next" | "later" | "excluded";

export const DEV_STATUS: Record<
  DevStatus,
  { label: string; tone: "brand" | "success" | "info" | "neutral"; scheduled: boolean }
> = {
  done: { label: "完了", tone: "success", scheduled: true },
  inProgress: { label: "進行中", tone: "brand", scheduled: true },
  planned: { label: "予定", tone: "info", scheduled: true },
  next: { label: "次候補", tone: "neutral", scheduled: false },
  later: { label: "中長期", tone: "neutral", scheduled: false },
  excluded: { label: "対象外", tone: "neutral", scheduled: false },
};

/** 編集時に選べるステータス（表示順）。 */
export const DEV_STATUS_ORDER: DevStatus[] = [
  "inProgress",
  "planned",
  "done",
  "next",
  "later",
  "excluded",
];

// ---- 項目 -----------------------------------------------------------------

export interface DevItem {
  id: string;
  /** 「開発進捗」台帳の No.（#143 の 143）。未採番なら undefined。 */
  no?: number;
  title: string;
  category: DevCategory;
  /** 優先度 1〜5（スプレッドシートの★の数）。 */
  priority: number;
  status: DevStatus;
  /** 着手予定週（その週の月曜, "YYYY-MM-DD"）。日程未定なら undefined。 */
  week?: string;
  /** 複数週にまたがる場合の週数（既定 1）。 */
  spanWeeks?: number;
  /** 同時に紐づく開発進捗の No.（強制リンクのように複数ある場合）。 */
  refs?: number[];
  /** 補足（「予約の○を赤◎に」など、依頼メッセージにも載る）。 */
  note?: string;
  /** 開発進捗の項目URL。指定があれば baseUrl からの組み立てより優先。 */
  url?: string;
}

// ---- 「開発進捗」との連携 -------------------------------------------------

/**
 * 「開発進捗」台帳のベースURL。No. から項目URLを組み立てる。
 * 連携先が決まったら環境変数を設定するだけで、画面側は変更不要。
 *   NEXT_PUBLIC_DEV_TRACKER_BASE_URL="https://example.com/dev/items"
 *     → #143 は https://example.com/dev/items/143
 * 未設定の場合はURLを出さず、No. だけで運用する（現在のMTG運用と同じ）。
 */
export const DEV_TRACKER_BASE_URL = (process.env.NEXT_PUBLIC_DEV_TRACKER_BASE_URL ?? "").replace(/\/+$/, "");

export function trackerUrl(item: Pick<DevItem, "no" | "url">): string | undefined {
  if (item.url) return item.url;
  if (item.no == null || !DEV_TRACKER_BASE_URL) return undefined;
  return `${DEV_TRACKER_BASE_URL}/${item.no}`;
}

/** "#143" / 未採番は "#—"。 */
export function refLabel(no?: number): string {
  return no == null ? "#—" : `#${no}`;
}

/** その項目に紐づく No. をまとめて "#143 #156 …" の形に。 */
export function allRefs(item: DevItem): number[] {
  return [...(item.no == null ? [] : [item.no]), ...(item.refs ?? [])];
}

/**
 * 週次MTGでそのまま送れる依頼メッセージ。
 * 現在の運用（項目URL、または #No. を送る）に合わせた最小限の体裁にしている。
 */
export function requestMessage(week: string, items: DevItem[]): string {
  const head = `【${weekLabel(week)}週の開発依頼】${items.length}件（${weekRangeLabel(week)}）`;
  const lines = items.map((it) => {
    const no = it.no == null ? "" : `#${it.no} `;
    const related = it.refs?.length ? ` ※関連 ${it.refs.map((n) => `#${n}`).join(" ")}` : "";
    const url = trackerUrl(it);
    return `・${no}${it.title}${it.note ? `（${it.note}）` : ""}${related}${url ? `\n  ${url}` : ""}`;
  });
  return [head, ...lines].join("\n");
}

// ---- 週の計算 -------------------------------------------------------------
// 日付は "YYYY-MM-DD" 文字列で保持し、計算はUTCで行う（タイムゾーン差で
// 週がズレないようにするため）。

const DAY_MS = 86_400_000;

function toUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

function isoOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return isoOf(new Date(toUtc(iso).getTime() + days * DAY_MS));
}

export function addWeeks(iso: string, weeks: number): string {
  return addDays(iso, weeks * 7);
}

/** その日を含む週の月曜日。 */
export function mondayOf(iso: string): string {
  const dow = (toUtc(iso).getUTCDay() + 6) % 7; // 月曜=0
  return addDays(iso, -dow);
}

/** from から to までの週数（同じ週なら0、未来は正）。 */
export function weeksBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / (7 * DAY_MS));
}

/** 月曜日 → "9/7"。 */
export function weekLabel(monday: string): string {
  const d = toUtc(monday);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** 月曜日 → "9/7〜9/13"。 */
export function weekRangeLabel(monday: string): string {
  return `${weekLabel(monday)}〜${weekLabel(addDays(monday, 6))}`;
}

/**
 * その週が属する月 "YYYY-MM"。木曜日が入る月＝週の過半数が属する月
 * （スプレッドシートで 8/31 が「9月」に入っているのと同じ数え方）。
 */
export function weekMonth(monday: string): string {
  return addDays(monday, 3).slice(0, 7);
}

/** 起点の月曜から count 週分の月曜日の配列。 */
export function buildWeeks(startMonday: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addWeeks(startMonday, i));
}

/** 週の並びを月ごとにまとめる（タイムラインの月ヘッダー用）。 */
export function groupWeeksByMonth(weeks: string[]): { ym: string; span: number }[] {
  const out: { ym: string; span: number }[] = [];
  for (const w of weeks) {
    const ym = weekMonth(w);
    const last = out[out.length - 1];
    if (last && last.ym === ym) last.span += 1;
    else out.push({ ym, span: 1 });
  }
  return out;
}

// ---- 優先度 ---------------------------------------------------------------

/** 優先度 → "★★★☆☆"（CSV出力など文字列が要る場所で使う）。 */
export function priorityStars(priority: number): string {
  const n = Math.max(0, Math.min(5, Math.round(priority)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

// ---- 画面上の編集内容（ブラウザ保存） -------------------------------------

export interface RoadmapOverride {
  /** null は「No. 未設定に戻す」。 */
  no?: number | null;
  /** null は「日程を未定に戻す」。 */
  week?: string | null;
  status?: DevStatus;
}

export type RoadmapOverrides = Record<string, RoadmapOverride>;

/** シード項目にブラウザ保存の編集内容を重ねる。 */
export function applyOverrides(items: DevItem[], overrides: RoadmapOverrides): DevItem[] {
  return items.map((it) => {
    const o = overrides[it.id];
    if (!o) return it;
    return {
      ...it,
      no: o.no === null ? undefined : (o.no ?? it.no),
      week: o.week === null ? undefined : (o.week ?? it.week),
      status: o.status ?? it.status,
    };
  });
}

// ---- 並び順・絞り込み -----------------------------------------------------

/** 日程が決まっている項目（タイムラインに載る）。 */
export function isScheduled(item: DevItem): boolean {
  return Boolean(item.week) && DEV_STATUS[item.status].scheduled;
}

/** 週の早い順 → 優先度の高い順。スプレッドシートと同じ並び。 */
export function byWeekThenPriority(a: DevItem, b: DevItem): number {
  const wa = a.week ?? "9999-99-99";
  const wb = b.week ?? "9999-99-99";
  if (wa !== wb) return wa < wb ? -1 : 1;
  return b.priority - a.priority;
}

/** 指定週に着手する項目。 */
export function itemsOfWeek(items: DevItem[], week: string): DevItem[] {
  return items.filter((it) => isScheduled(it) && it.week === week).sort(byWeekThenPriority);
}
