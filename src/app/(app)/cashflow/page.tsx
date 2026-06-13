import { AlertTriangle, Banknote, Clock, CreditCard, PiggyBank, Repeat, Wallet } from "lucide-react";
import { DonutChart, Sparkline, TrendChart } from "@/components/charts/charts";
import { CHART_COLORS } from "@/lib/colors";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui/primitives";
import { getCashflow } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatDate, formatNumber, formatPercent, formatYen, formatYenCompact, formatYm } from "@/lib/format";
import type { SettlementStatus } from "@/lib/types";

export const metadata = { title: "資金繰り" };

const STATUS: Record<SettlementStatus, { label: string; tone: "success" | "info" | "danger" }> = {
  paid: { label: "入金済", tone: "success" },
  scheduled: { label: "入金予定", tone: "info" },
  delayed: { label: "遅延", tone: "danger" },
};

export default function CashflowPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getCashflow(filters);
  const splitTotal = data.split.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHeader
        title="資金繰り・入金管理"
        description="現金の動き、各種決済の入金スケジュールと振込状況、決済手数料、前受金（役務）残高とサブスクMRRを一元管理します。"
        chips={<Badge tone="brand">当月</Badge>}
        actions={<PrintButton label="資金資料を出力" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-5">
        <StatCard label="当月現金売上" value={data.headline.cashSales} format="yenCompact" icon={<Banknote className="h-4 w-4" />} hint="レジ現金（要日次締め）" />
        <StatCard label="入金予定（純額）" value={data.headline.depositScheduled} format="yenCompact" icon={<Clock className="h-4 w-4" />} hint="未入金の決済分" />
        <StatCard label="入金遅延" value={data.headline.depositDelayed} format="yenCompact" icon={<AlertTriangle className="h-4 w-4" />} hint="要確認" />
        <StatCard label="当月決済手数料" value={data.headline.feesTotal} format="yenCompact" icon={<CreditCard className="h-4 w-4" />} hint="キャッシュレス各種" />
        <StatCard label="営業キャッシュフロー" value={data.headline.net} format="yenCompact" icon={<Wallet className="h-4 w-4" />} hint="売上−原価−販管費" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-8" title="キャッシュフロー推移" subtitle="入金（収入）・支出・ネットの月次推移" icon={<Wallet className="h-[18px] w-[18px]" />}>
          <TrendChart
            data={data.cfTrend}
            height={280}
            xFormat="month"
            series={[
              { key: "inflow", name: "収入", color: "#6366f1", type: "area" },
              { key: "outflow", name: "支出", color: "#f43f5e", type: "line", dashed: true },
              { key: "net", name: "ネットCF", color: "#22c55e", type: "line" },
            ]}
          />
        </ChartCard>

        <ChartCard className="xl:col-span-4" title="決済手段別 内訳" subtitle="当月売上の決済構成">
          <DonutChart
            data={data.split.map((p, i) => ({ name: p.label, value: p.amount, color: CHART_COLORS[i % CHART_COLORS.length] }))}
            centerLabel="売上合計"
            centerValue={formatYenCompact(splitTotal)}
          />
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* settlement schedule */}
        <Card className="xl:col-span-7">
          <CardHeader title="入金スケジュール" subtitle="決済代行会社からの振込（入金済・予定・遅延）" icon={<Clock className="h-[18px] w-[18px]" />} />
          <div className="mt-2 overflow-x-auto px-2 pb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="th">入金日</th>
                  <th className="th">決済代行</th>
                  <th className="th">手段</th>
                  <th className="th text-right">総額</th>
                  <th className="th text-right">手数料</th>
                  <th className="th text-right">入金額</th>
                  <th className="th text-center">状況</th>
                </tr>
              </thead>
              <tbody>
                {data.settlements.map((s) => (
                  <tr key={s.id} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
                    <td className="td tnum text-slate-500">{formatDate(s.date)}</td>
                    <td className="td font-medium text-slate-800 dark:text-slate-100">{s.processorName}</td>
                    <td className="td text-slate-500">{s.methodLabel}</td>
                    <td className="td text-right tnum">{formatYenCompact(s.gross)}</td>
                    <td className="td text-right tnum text-rose-500">-{formatYenCompact(s.fee)}</td>
                    <td className="td text-right tnum font-semibold">{formatYenCompact(s.net)}</td>
                    <td className="td text-center"><Badge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* processor breakdown */}
        <Card className="xl:col-span-5">
          <CardHeader title="決済代行会社別" subtitle="当月の取扱高・手数料・入金サイクル" icon={<CreditCard className="h-[18px] w-[18px]" />} />
          <div className="mt-2 space-y-3 px-5 pb-5 pt-1">
            {data.byProcessor.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{p.name}</span>
                  <Badge tone="neutral">手数料 {formatPercent(p.feeRate, 2)}</Badge>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                  <span>{p.method}</span>
                  <span>{p.cycle}</span>
                </div>
                <div className="mt-2 flex items-end justify-between">
                  <span className="text-xs text-slate-400">入金額（純額）</span>
                  <span className="tnum text-sm font-bold text-slate-900 dark:text-slate-50">{formatYenCompact(p.net)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* prepaid & subscription */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="前受金（役務）残高" subtitle="回数券・コースの未消化分。負債として管理・消化把握が必要です。" icon={<PiggyBank className="h-[18px] w-[18px]" />}>
          <div className="mb-3 grid grid-cols-3 gap-3">
            <StatInline label="期末残高" value={formatYenCompact(data.prepaid.balance)} tone="text-amber-600 dark:text-amber-400" />
            <StatInline label="当月販売" value={formatYenCompact(data.prepaid.sold)} />
            <StatInline label="当月消化" value={formatYenCompact(data.prepaid.consumed)} />
          </div>
          <TrendChart
            data={data.prepaid.trend}
            height={170}
            yFormat="yenCompact"
            xFormat="month"
            series={[{ key: "balance", name: "残高", color: "#f59e0b", type: "area" }]}
          />
        </ChartCard>

        <ChartCard title="サブスク（MRR）" subtitle="定額メニューの月次経常収益と会員数" icon={<Repeat className="h-[18px] w-[18px]" />}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="grid grid-cols-2 gap-3">
                <StatInline label="MRR" value={formatYenCompact(data.subscription.mrr)} tone="text-brand-600 dark:text-brand-300" />
                <StatInline label="会員数" value={`${formatNumber(data.subscription.members)}人`} />
                <StatInline label="新規" value={`+${formatNumber(data.subscription.newMembers)}`} tone="text-emerald-600 dark:text-emerald-400" />
                <StatInline label="解約" value={`-${formatNumber(data.subscription.churn)}`} tone="text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <p className="mb-1 text-xs text-slate-400">解約率（当月）</p>
              <ProgressBar value={data.subscription.churn / Math.max(1, data.subscription.members)} tone="rose" />
              <p className="mt-1 text-sm font-semibold tnum text-slate-700 dark:text-slate-200">{formatPercent(data.subscription.churn / Math.max(1, data.subscription.members))}</p>
              <div className="mt-2">
                <Sparkline data={[data.subscription.members - data.subscription.newMembers, data.subscription.members]} color="#6366f1" height={36} />
              </div>
            </div>
          </div>
        </ChartCard>
      </div>
    </>
  );
}

function StatInline({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tnum ${tone ?? "text-slate-900 dark:text-slate-50"}`}>{value}</p>
    </div>
  );
}
