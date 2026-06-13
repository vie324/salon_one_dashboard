import { Crown, HeartHandshake, PiggyBank, Repeat, UserPlus, Users } from "lucide-react";
import { BarsChart, DonutChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui/primitives";
import { getCustomers } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatNumber, formatPercent, formatYen, formatYenCompact, formatYm } from "@/lib/format";

export const metadata = { title: "顧客分析" };

export default function CustomersPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getCustomers(filters);
  const h = data.headline;
  const compareText = filters.compare === "prevYear" ? "前年同期比" : "前期間比";

  return (
    <>
      <PageHeader
        title="顧客分析"
        description="アクティブ顧客・新規/リピート・LTV・解約率・RFMセグメント、サブスク会員と前受金（役務）まで、顧客資産を多面的に把握します。"
        chips={<Badge tone="brand">{filters.period === "thisMonth" ? "当月" : "選択期間"}</Badge>}
        actions={<PrintButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="アクティブ顧客" value={h.active} format="number" icon={<Users className="h-4 w-4" />} hint="直近来店ベース" />
        <StatCard label="新規顧客" value={h.newCustomers} format="number" delta={h.newDelta} compareLabel={compareText} icon={<UserPlus className="h-4 w-4" />} />
        <StatCard label="リピート率" value={h.repeatRate} format="percent" icon={<Repeat className="h-4 w-4" />} sparkColor="#22c55e" />
        <StatCard label="解約・離脱率" value={h.churnRate} format="percent" invert icon={<HeartHandshake className="h-4 w-4" />} sparkColor="#f43f5e" />
        <StatCard label="推定LTV" value={h.ltv} format="yen" icon={<Crown className="h-4 w-4" />} hint="客単価×来店頻度×継続" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-8" title="新規 / リピート 推移" subtitle="直近12ヶ月" icon={<Users className="h-[18px] w-[18px]" />}>
          <BarsChart
            data={data.trend}
            height={280}
            xFormat="month"
            yFormat="person"
            series={[
              { key: "repeat", name: "リピート", color: "#6366f1", stackId: "a" },
              { key: "new", name: "新規", color: "#f59e0b", stackId: "a" },
            ]}
          />
        </ChartCard>

        <ChartCard className="xl:col-span-4" title="RFMセグメント" subtitle="顧客の質的構成">
          <DonutChart
            data={data.rfm.map((r) => ({ name: r.label, value: r.count, color: r.color }))}
            valueFormat="person"
            centerLabel="顧客数"
            centerValue={formatNumber(h.active)}
          />
          <div className="mt-3 space-y-1.5">
            {data.rfm.map((r) => (
              <div key={r.label} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                <span className="text-slate-700 dark:text-slate-200">{r.label}</span>
                <span className="ml-auto tnum text-slate-500">{formatNumber(r.count)}人</span>
                <span className="w-10 text-right text-xs tnum text-slate-400">{formatPercent(r.share, 0)}</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-8" title="サブスク会員の推移" subtitle="定額メニュー会員数とMRR" icon={<Repeat className="h-[18px] w-[18px]" />}>
          <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="会員数" value={`${formatNumber(data.subscription.members)}人`} />
            <Mini label="MRR" value={formatYenCompact(data.subscription.mrr)} tone="text-brand-600 dark:text-brand-300" />
            <Mini label="新規" value={`+${formatNumber(data.subscription.newMembers)}`} tone="text-emerald-600 dark:text-emerald-400" />
            <Mini label="解約" value={`-${formatNumber(data.subscription.churn)}`} tone="text-rose-600 dark:text-rose-400" />
          </div>
          <BarsChart
            data={data.subscription.trend}
            height={220}
            xFormat="month"
            yFormat="person"
            series={[{ key: "members", name: "会員数", color: "#6366f1" }]}
          />
        </ChartCard>

        <ChartCard className="xl:col-span-4" title="前受金（役務）" subtitle="回数券・コースの未消化残高" icon={<PiggyBank className="h-[18px] w-[18px]" />}>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-400">期末残高（負債計上）</p>
              <p className="mt-0.5 text-2xl font-bold tnum text-amber-600 dark:text-amber-400">{formatYen(data.prepaid.balance)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Mini label="当月販売" value={formatYenCompact(data.prepaid.sold)} />
              <Mini label="当月消化" value={formatYenCompact(data.prepaid.consumed)} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-400">
                <span>消化率（当月販売比）</span>
                <span className="tnum">{formatPercent(data.prepaid.consumed / Math.max(1, data.prepaid.sold), 0)}</span>
              </div>
              <ProgressBar value={data.prepaid.consumed / Math.max(1, data.prepaid.sold)} tone="amber" />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              前受金は売上ではなく負債です。役務提供（消化）時に売上計上されるため、残高と消化ペースの管理が会計・資金繰り双方で重要です。
            </p>
          </div>
        </ChartCard>
      </div>
    </>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tnum ${tone ?? "text-slate-900 dark:text-slate-50"}`}>{value}</p>
    </div>
  );
}
