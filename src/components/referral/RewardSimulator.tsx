"use client";

// 紹介特典のシミュレーター。
//   紹介した側　 : 初期費用 × 25%
//   紹介された側 : 初月の端数日数（日割り）＋ 2ヶ月無料
// 料金は仮置き（src/lib/referral.ts の FEE_ASSUMPTION）。実際の料金表に
// 合わせて初期値を変更してください。

import { CalendarClock, Calculator, Gift, HandCoins } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/primitives";
import { TODAY } from "@/lib/filters";
import { formatDateFull, formatPercent, formatYen } from "@/lib/format";
import {
  FEE_ASSUMPTION,
  REFERRAL_PROGRAM,
  freePeriod,
  freePeriodValue,
  referrerReward,
} from "@/lib/referral";

export function RewardSimulator({ className }: { className?: string }) {
  const [initialFee, setInitialFee] = useState<number>(FEE_ASSUMPTION.initialFee);
  const [monthlyFee, setMonthlyFee] = useState<number>(FEE_ASSUMPTION.monthlyFee);
  const [start, setStart] = useState(TODAY);

  const reward = referrerReward(initialFee);
  const period = useMemo(() => freePeriod(start), [start]);
  const freeValue = freePeriodValue(monthlyFee, period);

  return (
    <Card className={className}>
      <CardHeader
        title="特典シミュレーター"
        subtitle="初期費用と利用開始日から、双方の特典を試算します"
        icon={<Calculator className="h-[18px] w-[18px]" />}
      />
      <div className="px-5 pb-5 pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">初期費用</span>
            <input
              type="number"
              min={0}
              step={10000}
              className="input w-full tnum"
              value={initialFee}
              onChange={(e) => setInitialFee(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">月額</span>
            <input
              type="number"
              min={0}
              step={1000}
              className="input w-full tnum"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500 dark:text-slate-400">利用開始日</span>
            <input
              type="date"
              className="input w-full"
              value={start}
              onChange={(e) => e.target.value && setStart(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* 紹介した側 */}
          <div className="rounded-xl border border-gold-200 bg-gold-50/60 p-4 dark:border-gold-500/25 dark:bg-gold-500/10">
            <div className="flex items-center gap-2 text-gold-700 dark:text-gold-300">
              <HandCoins className="h-4 w-4" />
              <span className="text-xs font-semibold">紹介した側へのお支払い</span>
            </div>
            <p className="mt-1.5 text-2xl font-bold tnum text-slate-900 dark:text-slate-50">{formatYen(reward)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              初期費用 {formatYen(initialFee)} × {formatPercent(REFERRAL_PROGRAM.rewardRate, 0)}
              （{REFERRAL_PROGRAM.rewardTiming}）
            </p>
          </div>

          {/* 紹介された側 */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-500/25 dark:bg-brand-500/10">
            <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
              <Gift className="h-4 w-4" />
              <span className="text-xs font-semibold">紹介された側の無料期間（相当額）</span>
            </div>
            <p className="mt-1.5 text-2xl font-bold tnum text-slate-900 dark:text-slate-50">{formatYen(freeValue)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              端数 {period.remainderDays} 日（日割り）＋ 月額 {formatYen(monthlyFee)} × {period.freeMonths}ヶ月
            </p>
          </div>
        </div>

        {/* 無料期間のタイムライン */}
        <div className="panel mt-3 p-4">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <CalendarClock className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium">
              {formatDateFull(period.start)} 〜 {formatDateFull(period.freeUntil)} が無料
              <span className="tnum ml-1.5 text-slate-400">（合計 {period.totalFreeDays} 日）</span>
            </span>
          </div>
          <div className="mt-3 flex overflow-hidden rounded-lg text-[11px] font-medium text-white">
            <div
              className="grid place-items-center bg-brand-400 py-1.5"
              style={{ width: `${(period.remainderDays / period.totalFreeDays) * 100}%` }}
              title={`初月の端数 ${period.remainderDays} 日`}
            >
              {period.remainderDays}日
            </div>
            <div
              className="grid flex-1 place-items-center bg-brand-600 py-1.5"
              title={`${period.freeMonths}ヶ月無料`}
            >
              {period.freeMonths}ヶ月無料
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            初回のご請求は {formatDateFull(period.billingStart)} 開始分から（月額 {formatYen(monthlyFee)}）。
          </p>
        </div>
      </div>
    </Card>
  );
}
