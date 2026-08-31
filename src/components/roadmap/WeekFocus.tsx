"use client";

import { Check, ChevronLeft, ChevronRight, ClipboardCopy, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { copyText } from "@/lib/clipboard";
import {
  DEV_CATEGORY,
  WEEKLY_WIP_LIMIT,
  allRefs,
  requestMessage,
  weekLabel,
  weekRangeLabel,
  type DevItem,
  type RoadmapOverride,
} from "@/lib/roadmap";
import { CategoryChip, ItemEditor, PriorityStars, RefLink, StatusPill } from "./parts";

/**
 * 「今週進める項目」。週次MTGでそのまま共有できるよう、開発進捗の No./URL と
 * 送付用メッセージをこの1枚にまとめている。
 */
export function WeekFocus({
  week,
  currentWeek,
  items,
  edit,
  weekOptions,
  onChange,
  onMove,
  onToday,
}: {
  week: string;
  currentWeek: string;
  items: DevItem[];
  edit: boolean;
  weekOptions: string[];
  onChange: (id: string, patch: RoadmapOverride) => void;
  onMove: (delta: number) => void;
  onToday: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const isCurrent = week === currentWeek;
  const message = requestMessage(week, items);
  const over = items.length > WEEKLY_WIP_LIMIT;

  async function handleCopy() {
    if (await copyText(message)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader
        title={isCurrent ? "今週進める項目" : `${weekLabel(week)}週に進める項目`}
        subtitle={`${weekRangeLabel(week)}・${items.length}件`}
        actions={
          <div className="flex items-center gap-1.5 print:hidden">
            <button
              onClick={() => onMove(-1)}
              className="btn btn-outline btn-icon h-8 w-8"
              aria-label="前の週"
              title="前の週"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {!isCurrent && (
              <button onClick={onToday} className="btn btn-ghost btn-sm" title="今週に戻る">
                今週
              </button>
            )}
            <button
              onClick={() => onMove(1)}
              className="btn btn-outline btn-icon h-8 w-8"
              aria-label="次の週"
              title="次の週"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {items.length > 0 && (
              <button
                onClick={handleCopy}
                className={cn("btn btn-sm ml-1", copied ? "btn-outline" : "btn-primary")}
                title="MTGでそのまま送れる依頼メッセージをコピー"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                {copied ? "コピーしました" : "依頼メッセージ"}
              </button>
            )}
          </div>
        }
      />

      <div className="mt-3 divide-y divide-slate-100 border-t dark:divide-slate-800">
        {items.map((item) => (
          <FocusRow
            key={item.id}
            item={item}
            edit={edit}
            weekOptions={weekOptions}
            onChange={onChange}
          />
        ))}
        {items.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-slate-400">
            この週に予定している項目はありません。
          </p>
        )}
      </div>

      {edit && over && (
        <p className="border-t px-5 py-2.5 text-xs text-amber-600 dark:text-amber-400">
          この週は {items.length} 件です。1週あたり {WEEKLY_WIP_LIMIT} 件までに絞ると、
          開発側で「今週やること」が明確になります。
        </p>
      )}

      {items.length > 0 && (
        <div className="border-t px-5 py-2.5 print:hidden">
          <button
            onClick={() => setShowMessage((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            {showMessage ? "送付メッセージを閉じる" : "送付メッセージを確認"}
          </button>
          {showMessage && (
            <pre className="panel mt-2 whitespace-pre-wrap p-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              {message}
            </pre>
          )}
        </div>
      )}
    </Card>
  );
}

function FocusRow({
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
  const refs = allRefs(item).slice(1);
  return (
    <div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
      <span
        className="hidden h-8 w-1 shrink-0 rounded-full sm:block"
        style={{ background: DEV_CATEGORY[item.category].color }}
        aria-hidden
      />
      <div className="flex w-full min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
        <CategoryChip category={item.category} className="w-16 shrink-0" />
        <RefLink item={item} className="w-14 shrink-0" />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-medium text-slate-800 dark:text-slate-100",
              item.status === "done" && "text-slate-400 line-through dark:text-slate-500",
            )}
          >
            {item.title}
          </p>
          {(item.note || refs.length > 0) && (
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {item.note}
              {item.note && refs.length > 0 && " ・ "}
              {refs.length > 0 && `関連 ${refs.map((n) => `#${n}`).join(" ")}`}
            </p>
          )}
        </div>
        <PriorityStars value={item.priority} className="shrink-0" />
        <StatusPill status={item.status} className="shrink-0" />
      </div>
      {edit && (
        <ItemEditor
          item={item}
          weekOptions={weekOptions}
          onChange={onChange}
          className="shrink-0 print:hidden"
        />
      )}
    </div>
  );
}
