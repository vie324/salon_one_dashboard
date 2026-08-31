"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/primitives";
import {
  DEV_CATEGORY,
  DEV_STATUS,
  DEV_STATUS_ORDER,
  refLabel,
  trackerUrl,
  weekLabel,
  type DevCategory,
  type DevItem,
  type DevStatus,
  type RoadmapOverride,
} from "@/lib/roadmap";

/** カテゴリ（基盤 / 分析 …）。色は一覧の中で目印になる程度に留める。 */
export function CategoryChip({
  category,
  className,
}: {
  category: DevCategory;
  className?: string;
}) {
  const c = DEV_CATEGORY[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400",
        className,
      )}
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

/** 優先度（スプレッドシートの★の数）。 */
export function PriorityStars({ value, className }: { value: number; className?: string }) {
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span
      className={cn("select-none whitespace-nowrap text-[11px] leading-none", className)}
      title={`優先度 ${n}/5`}
      aria-label={`優先度 ${n}/5`}
    >
      <span className="text-amber-500">{"★".repeat(n)}</span>
      <span className="text-slate-300 dark:text-slate-700">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export function StatusPill({ status, className }: { status: DevStatus; className?: string }) {
  const s = DEV_STATUS[status];
  return (
    <Badge tone={s.tone} className={cn("px-1.5 py-0 text-[10.5px]", className)}>
      {s.label}
    </Badge>
  );
}

/**
 * 「開発進捗」台帳への参照。ベースURLが設定されていればリンク、
 * 未設定なら現在のMTG運用どおり No. だけを表示する。
 */
export function RefLink({ item, className }: { item: DevItem; className?: string }) {
  const url = trackerUrl(item);
  const label = refLabel(item.no);
  // No. 未設定のときは空欄（幅は保つ）。「#—」が並ぶと未整備に見えるため、
  // 採番は編集モードの入力欄で促す。
  if (item.no == null) return <span className={className} aria-hidden />;
  if (!url) {
    return (
      <span className={cn("tnum text-[11px] font-semibold text-slate-500 dark:text-slate-400", className)}>
        {label}
      </span>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "tnum inline-flex items-center gap-0.5 text-[11px] font-semibold text-brand-700 hover:underline dark:text-brand-300",
        className,
      )}
      title="開発進捗で開く"
    >
      {label}
      <ExternalLink className="h-2.5 w-2.5" />
    </a>
  );
}

/**
 * 編集モードで出る操作（開発進捗の No. / 着手週 / ステータス）。
 * 一覧・タイムライン・候補リストのどこからでも同じ操作ができるようにしている。
 */
export function ItemEditor({
  item,
  weekOptions,
  onChange,
  layout = "wide",
  className,
}: {
  item: DevItem;
  weekOptions: string[];
  onChange: (id: string, patch: RoadmapOverride) => void;
  layout?: "wide" | "compact";
  className?: string;
}) {
  const compact = layout === "compact";
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <label className={cn("relative", compact && "w-full")}>
        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">
          #
        </span>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          className={cn("input tnum h-7 pl-4 pr-1.5 text-[11px]", compact ? "w-full" : "w-[86px]")}
          value={item.no ?? ""}
          placeholder="No."
          aria-label="開発進捗の No."
          onChange={(e) => {
            const v = e.target.value.trim();
            onChange(item.id, { no: v === "" ? null : Number(v) });
          }}
        />
      </label>
      <select
        className={cn("select h-7 px-1.5 text-[11px]", compact ? "min-w-0 flex-1" : "w-[104px]")}
        value={item.week ?? ""}
        aria-label="着手週"
        onChange={(e) => onChange(item.id, { week: e.target.value === "" ? null : e.target.value })}
      >
        <option value="">日程未定</option>
        {weekOptions.map((w) => (
          <option key={w} value={w}>
            {weekLabel(w)}週
          </option>
        ))}
      </select>
      <select
        className={cn("select h-7 px-1.5 text-[11px]", compact ? "min-w-0 flex-1" : "w-[92px]")}
        value={item.status}
        aria-label="ステータス"
        onChange={(e) => onChange(item.id, { status: e.target.value as DevStatus })}
      >
        {DEV_STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {DEV_STATUS[s].label}
          </option>
        ))}
      </select>
    </div>
  );
}
