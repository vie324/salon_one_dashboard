"use client";

import { CalendarRange, ChevronDown, Pencil, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/primitives";
import { ExportCsvButton } from "@/components/ui/ExportCsvButton";
import { cn } from "@/lib/cn";
import type { RoadmapData } from "@/lib/data";
import { shiftYm } from "@/lib/filters";
import { formatYm } from "@/lib/format";
import {
  DEV_STATUS,
  ROADMAP_STORAGE_KEY,
  addWeeks,
  allRefs,
  applyOverrides,
  buildWeeks,
  byWeekThenPriority,
  isScheduled,
  itemsOfWeek,
  priorityStars,
  weekLabel,
  weekMonth,
  weekRangeLabel,
  weeksBetween,
  type DevItem,
  type DevStatus,
  type RoadmapOverride,
  type RoadmapOverrides,
} from "@/lib/roadmap";
import { Timeline, type Lane } from "./Timeline";
import { WeekFocus } from "./WeekFocus";
import { CategoryChip, ItemEditor, PriorityStars, RefLink } from "./parts";

/** 週表示・月表示で最低限見せるコマ数。 */
const WEEK_LANES = 8;
const MONTH_LANES = 6;
/** 日程未定として畳んでおくステータス（依頼が多く見えないよう既定は閉じる）。 */
const BACKLOG_GROUPS: DevStatus[] = ["next", "later", "excluded"];

/** 月ヘッダー。年が変わるときだけ「2026年9月」と年を添える。 */
function monthGroupLabel(weeks: string[], i: number): string | undefined {
  const ym = weekMonth(weeks[i]);
  if (i === 0) return formatYm(ym, true);
  const prev = weekMonth(weeks[i - 1]);
  if (ym === prev) return undefined;
  return ym.slice(0, 4) === prev.slice(0, 4) ? formatYm(ym) : formatYm(ym, true);
}

export function RoadmapBoard({ data }: { data: RoadmapData }) {
  const [overrides, setOverrides] = useState<RoadmapOverrides>({});
  const [loaded, setLoaded] = useState(false);
  const [edit, setEdit] = useState(false);
  const [granularity, setGranularity] = useState<"week" | "month">("week");
  const [focusWeek, setFocusWeek] = useState(data.currentWeek);
  const [showBacklog, setShowBacklog] = useState(false);

  // 画面上の編集内容を読み込む
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ROADMAP_STORAGE_KEY);
      if (raw) setOverrides(JSON.parse(raw) as RoadmapOverrides);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  // 保存
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(ROADMAP_STORAGE_KEY, JSON.stringify(overrides));
    } catch {
      /* ignore */
    }
  }, [overrides, loaded]);

  function change(id: string, patch: RoadmapOverride) {
    setOverrides((o) => ({ ...o, [id]: { ...o[id], ...patch } }));
  }
  function reset() {
    setOverrides({});
  }

  const items = useMemo(() => applyOverrides(data.items, overrides), [data.items, overrides]);
  const scheduled = useMemo(() => items.filter(isScheduled), [items]);

  // 横軸の範囲。最も早い予定〜最も遅い予定を必ず含む（最低 WEEK_LANES コマ）。
  const weeks = useMemo(() => {
    const start = scheduled.reduce(
      (min, it) => (it.week && it.week < min ? it.week : min),
      data.currentWeek,
    );
    const end = scheduled.reduce(
      (max, it) => (it.week && it.week > max ? it.week : max),
      addWeeks(start, WEEK_LANES - 1),
    );
    const count = Math.min(26, Math.max(WEEK_LANES, weeksBetween(start, end) + 1));
    return buildWeeks(start, count);
  }, [scheduled, data.currentWeek]);

  // 週の選択肢は、表示範囲＋実際に使われている週（範囲外に飛ばした場合の保険）。
  const weekOptions = useMemo(() => {
    const set = new Set(weeks);
    for (const it of items) if (it.week) set.add(it.week);
    return [...set].sort();
  }, [weeks, items]);

  const months = useMemo(() => {
    const startYm = weekMonth(weeks[0]);
    const endYm = weekMonth(weeks[weeks.length - 1]);
    const out: string[] = [];
    for (let i = 0; i < 24; i++) {
      const ym = shiftYm(startYm, i);
      if (i >= MONTH_LANES && ym > endYm) break;
      out.push(ym);
    }
    return out;
  }, [weeks]);

  const currentYm = weekMonth(data.currentWeek);

  const lanes: Lane[] = useMemo(() => {
    if (granularity === "week") {
      return weeks.map((w, i) => ({
        key: w,
        label: `${weekLabel(w)}週`,
        sublabel: weekRangeLabel(w),
        group: monthGroupLabel(weeks, i),
        isCurrent: w === data.currentWeek,
        isPast: w < data.currentWeek,
        items: itemsOfWeek(items, w),
      }));
    }
    return months.map((ym, i) => ({
      key: ym,
      label: formatYm(ym),
      group: i === 0 || ym.slice(0, 4) !== months[i - 1].slice(0, 4) ? `${ym.slice(0, 4)}年` : undefined,
      isCurrent: ym === currentYm,
      isPast: ym < currentYm,
      items: scheduled
        .filter((it) => weekMonth(it.week as string) === ym)
        .sort(byWeekThenPriority),
    }));
  }, [granularity, weeks, months, items, scheduled, data.currentWeek, currentYm]);

  const focusItems = useMemo(() => itemsOfWeek(items, focusWeek), [items, focusWeek]);
  const backlog = useMemo(
    () => BACKLOG_GROUPS.map((s) => ({ status: s, items: items.filter((i) => i.status === s) })),
    [items],
  );
  const backlogCount = backlog.reduce((n, g) => n + g.items.length, 0);

  const thisWeekCount = useMemo(
    () => itemsOfWeek(items, data.currentWeek).length,
    [items, data.currentWeek],
  );
  const inProgress = items.filter((i) => i.status === "inProgress").length;
  const done = items.filter((i) => i.status === "done").length;
  const dirty = Object.keys(overrides).length > 0;

  const csvRows = useMemo(
    () =>
      [...items].sort(byWeekThenPriority).map((it) => [
        it.category,
        it.title,
        priorityStars(it.priority),
        DEV_STATUS[it.status].label,
        it.week ? `${weekLabel(it.week)}週` : "",
        it.no ?? "",
        allRefs(it).slice(1).map((n) => `#${n}`).join(" "),
        it.note ?? "",
      ]),
    [items],
  );

  return (
    <div className="space-y-5">
      {/* 進み具合と操作 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          今週 <strong className="tnum font-semibold text-slate-700 dark:text-slate-200">{thisWeekCount}</strong> 件
          ・進行中 <strong className="tnum font-semibold text-slate-700 dark:text-slate-200">{inProgress}</strong> 件
          ・完了 <strong className="tnum font-semibold text-slate-700 dark:text-slate-200">{done}</strong> 件
        </p>
        <div className="flex items-center gap-2 print:hidden">
          {edit && dirty && (
            <button onClick={reset} className="btn btn-ghost btn-sm" title="スプレッドシートの内容に戻す">
              <RotateCcw className="h-3.5 w-3.5" />
              元に戻す
            </button>
          )}
          <ExportCsvButton
            filename={`開発ロードマップ_${data.currentWeek}`}
            headers={["カテゴリ", "機能", "優先度", "ステータス", "着手週", "No.", "関連No.", "備考"]}
            rows={csvRows}
          />
          <button
            onClick={() => setEdit((v) => !v)}
            className={cn("btn btn-sm", edit ? "btn-primary" : "btn-outline")}
            title="No.・着手週・ステータスを編集する"
          >
            <Pencil className="h-3.5 w-3.5" />
            {edit ? "編集を終了" : "編集"}
          </button>
        </div>
      </div>

      <WeekFocus
        week={focusWeek}
        currentWeek={data.currentWeek}
        items={focusItems}
        edit={edit}
        weekOptions={weekOptions}
        onChange={change}
        onMove={(d) => setFocusWeek((w) => addWeeks(w, d))}
        onToday={() => setFocusWeek(data.currentWeek)}
      />

      <Card>
        <CardHeader
          title="スケジュール"
          subtitle={
            granularity === "week"
              ? "週ごとの着手予定。見出しを押すと、その週を上に表示します。"
              : "月ごとの着手予定（中長期）。"
          }
          icon={<CalendarRange className="h-4 w-4" />}
          actions={
            <div className="flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700 print:hidden">
              {(["week", "month"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition",
                    granularity === g
                      ? "bg-brand-600 text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
                  )}
                >
                  {g === "week" ? "週" : "月"}
                </button>
              ))}
            </div>
          }
        />
        <Timeline
          lanes={lanes}
          edit={edit}
          dense={granularity === "month" && !edit}
          weekOptions={weekOptions}
          onChange={change}
          onPickLane={granularity === "week" ? (key) => setFocusWeek(key) : undefined}
        />
      </Card>

      {/* 日程未定の候補は既定で畳んでおく */}
      <Card>
        <button
          onClick={() => setShowBacklog((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
          aria-expanded={showBacklog}
        >
          <span className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            日程未定の候補
            <span className="ml-2 tnum text-xs font-normal text-slate-400">{backlogCount}件</span>
          </span>
          <ChevronDown
            className={cn("h-4 w-4 shrink-0 text-slate-400 transition", showBacklog && "rotate-180")}
          />
        </button>

        {showBacklog && (
          <div className="border-t">
            {backlog
              .filter((g) => g.items.length > 0)
              .map((g) => (
                <section key={g.status}>
                  <h4 className="bg-slate-50/70 px-5 py-1.5 text-[11px] font-semibold tracking-wide text-slate-500 dark:bg-slate-900/50 dark:text-slate-400">
                    {DEV_STATUS[g.status].label}
                    <span className="ml-1.5 tnum font-normal text-slate-400">{g.items.length}</span>
                  </h4>
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {g.items.map((item) => (
                      <BacklogRow
                        key={item.id}
                        item={item}
                        edit={edit}
                        weekOptions={weekOptions}
                        onChange={change}
                      />
                    ))}
                  </ul>
                </section>
              ))}
            {backlogCount === 0 && (
              <p className="px-5 py-6 text-center text-sm text-slate-400">候補はありません。</p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

function BacklogRow({
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
  const muted = item.status === "excluded";
  return (
    <li className="flex flex-col gap-2 px-5 py-2.5 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <CategoryChip category={item.category} className="w-16 shrink-0" />
        <RefLink item={item} className="w-14 shrink-0" />
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-sm text-slate-700 dark:text-slate-200",
            muted && "text-slate-400 line-through dark:text-slate-500",
          )}
        >
          {item.title}
          {item.note && <span className="ml-2 text-xs text-slate-400">{item.note}</span>}
        </p>
        <PriorityStars value={item.priority} className="shrink-0" />
      </div>
      {edit && (
        <ItemEditor
          item={item}
          weekOptions={weekOptions}
          onChange={onChange}
          className="shrink-0 print:hidden"
        />
      )}
    </li>
  );
}
