"use client";

import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/primitives";
import { DEV_CATEGORY, type DevItem, type RoadmapOverride } from "@/lib/roadmap";
import { CategoryChip, ItemEditor, PriorityStars, RefLink, StatusPill } from "./parts";

/** 横軸の1コマ。週表示なら1週、月表示なら1ヶ月。 */
export interface Lane {
  key: string;
  /** "8/31" / "9月" */
  label: string;
  /** "8/31〜9/6" など */
  sublabel?: string;
  /** 週表示のとき、その月の先頭レーンにだけ入る月ラベル。 */
  group?: string;
  isCurrent: boolean;
  isPast: boolean;
  items: DevItem[];
}

export function Timeline({
  lanes,
  edit,
  dense,
  weekOptions,
  onChange,
  onPickLane,
}: {
  lanes: Lane[];
  edit: boolean;
  /** 中長期（月表示）は1行ずつの一覧にして、縦に伸びないようにする。 */
  dense?: boolean;
  /** 編集時に選べる週（月曜日）。 */
  weekOptions: string[];
  onChange: (id: string, patch: RoadmapOverride) => void;
  /** レーンの見出しを押したときに「今週のフォーカス」を移す。 */
  onPickLane?: (key: string) => void;
}) {
  return (
    <div className="overflow-x-auto px-5 pb-5 pt-3 print:overflow-visible">
      <div className="flex min-w-max items-stretch gap-2.5">
        {lanes.map((lane) => (
          <div key={lane.key} className="flex w-[208px] shrink-0 flex-col">
            {/* 月ヘッダー（週表示のとき、月の先頭レーンにだけ出す） */}
            <div className="h-5 pl-0.5 text-[11px] font-semibold tracking-wide text-slate-400">
              {lane.group ?? ""}
            </div>

            {/* 期間の見出し */}
            <LaneHeader lane={lane} onPick={onPickLane} />

            {/* その期間に進める項目 */}
            <div
              className={cn(
                "flex flex-1 flex-col rounded-b-xl border border-t-0",
                dense ? "gap-0.5 p-1.5" : "gap-2 p-2",
                lane.isCurrent
                  ? "border-brand-200 bg-brand-50/40 dark:border-brand-500/30 dark:bg-brand-500/[0.06]"
                  : "border-slate-200/80 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/30",
                lane.isPast && !lane.isCurrent && "opacity-60",
              )}
            >
              {lane.items.map((item) =>
                dense ? (
                  <LaneRow key={item.id} item={item} />
                ) : (
                  <LaneCard
                    key={item.id}
                    item={item}
                    edit={edit}
                    weekOptions={weekOptions}
                    onChange={onChange}
                  />
                ),
              )}
              {lane.items.length === 0 && (
                <div className="flex flex-1 items-center justify-center py-6">
                  <span className="text-[11px] text-slate-300 dark:text-slate-700">予定なし</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LaneHeader({ lane, onPick }: { lane: Lane; onPick?: (key: string) => void }) {
  const inner = (
    <>
      <div className="min-w-0">
        <div
          className={cn(
            "text-[13px] font-semibold",
            lane.isCurrent
              ? "text-brand-700 dark:text-brand-300"
              : "text-slate-700 dark:text-slate-200",
          )}
        >
          {lane.label}
        </div>
        {lane.sublabel && (
          <div className="truncate text-[10.5px] text-slate-400">{lane.sublabel}</div>
        )}
      </div>
      {lane.isCurrent ? (
        <Badge tone="brand" className="px-1.5 py-0 text-[10.5px]">
          今週
        </Badge>
      ) : (
        lane.items.length > 0 && (
          <span className="tnum text-[11px] text-slate-400">{lane.items.length}件</span>
        )
      )}
    </>
  );

  const className = cn(
    "flex items-center justify-between gap-2 rounded-t-xl border px-2.5 py-1.5 text-left",
    lane.isCurrent
      ? "border-brand-200 bg-brand-50 dark:border-brand-500/30 dark:bg-brand-500/10"
      : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900",
    onPick && "transition hover:bg-slate-50 dark:hover:bg-slate-800/60",
  );

  if (!onPick) return <div className={className}>{inner}</div>;
  return (
    <button type="button" onClick={() => onPick(lane.key)} className={className} title="この週を上に表示">
      {inner}
    </button>
  );
}

function LaneCard({
  item,
  edit,
  weekOptions,
  onChange,
}: {
  item: DevItem;
  edit: boolean;
  weekOptions: string[];
  onChange: (id: string, patch: RoadmapOverride) => void;
}) {
  const color = DEV_CATEGORY[item.category].color;
  const done = item.status === "done";
  return (
    <article
      className={cn(
        "rounded-lg border bg-white px-2.5 py-2 shadow-soft dark:bg-slate-900",
        item.status === "inProgress"
          ? "border-brand-200 dark:border-brand-500/30"
          : "border-slate-200/80 dark:border-slate-800",
      )}
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div className="flex items-center gap-1.5">
        <CategoryChip category={item.category} />
        <RefLink item={item} className="ml-auto" />
      </div>

      <p
        className={cn(
          "mt-1 text-[12.5px] font-medium leading-snug text-slate-800 dark:text-slate-100",
          done && "text-slate-400 line-through dark:text-slate-500",
        )}
      >
        {item.title}
      </p>
      {item.note && <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{item.note}</p>}

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <PriorityStars value={item.priority} />
        {item.status !== "planned" && <StatusPill status={item.status} />}
      </div>

      {edit && (
        <ItemEditor
          item={item}
          weekOptions={weekOptions}
          onChange={onChange}
          layout="compact"
          className="mt-2 border-t border-dashed pt-2"
        />
      )}
    </article>
  );
}

/** 月表示（中長期）の1行。件数が多くても縦に伸びないよう最小限の情報にする。 */
function LaneRow({ item }: { item: DevItem }) {
  return (
    <div
      className="flex items-center gap-1.5 rounded-md bg-white py-1 pl-2 pr-1.5 dark:bg-slate-900"
      style={{ borderLeft: `2px solid ${DEV_CATEGORY[item.category].color}` }}
      title={`${DEV_CATEGORY[item.category].label}・${item.title}`}
    >
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[12px] text-slate-700 dark:text-slate-200",
          item.status === "done" && "text-slate-400 line-through dark:text-slate-500",
        )}
      >
        {item.title}
      </span>
      <RefLink item={item} />
      {item.status === "inProgress" && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" title="進行中" />
      )}
    </div>
  );
}
