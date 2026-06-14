import { Megaphone, MessageCircle, Star, Target, TrendingUp, UserPlus } from "lucide-react";
import { BarsChart, DonutChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui/primitives";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { getMarketing } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatNumber, formatPercent } from "@/lib/format";
import type { ChannelKind } from "@/lib/types";

export const metadata = { title: "マーケティング" };

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 flex items-center gap-1">
        <span className="text-lg font-bold tnum text-slate-900 dark:text-slate-50">{value.toFixed(1)}</span>
        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
      </p>
    </div>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold tnum text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}

const KIND: Record<ChannelKind, { label: string; tone: "brand" | "info" | "success" | "neutral"; color: string }> = {
  paid: { label: "広告", tone: "brand", color: "#0f766e" },
  owned: { label: "自社", tone: "info", color: "#0ea5e9" },
  referral: { label: "紹介", tone: "success", color: "#22c55e" },
  organic: { label: "自然流入", tone: "neutral", color: "#94a3b8" },
};

export default function MarketingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getMarketing(filters);

  const byKind = (Object.keys(KIND) as ChannelKind[]).map((k) => ({
    name: KIND[k].label,
    value: data.rows.filter((r) => r.kind === k).reduce((s, r) => s + r.newCustomers, 0),
    color: KIND[k].color,
  })).filter((d) => d.value > 0);

  const cols: Column[] = [
    { key: "channel", label: "チャネル", type: "text" },
    { key: "kind", label: "種別", type: "badge", align: "center" },
    { key: "spend", label: "広告費", type: "yenCompact", align: "right", zeroDash: true },
    { key: "newCustomers", label: "新規獲得", type: "number", align: "right" },
    { key: "bookings", label: "予約数", type: "number", align: "right" },
    { key: "cpa", label: "CPA", type: "yen", align: "right", zeroDash: true },
    { key: "roas", label: "ROAS", type: "decimal", align: "right", suffix: "x", zeroDash: true },
    { key: "ltv", label: "推定LTV", type: "yen", align: "right" },
    { key: "revenue", label: "貢献売上", type: "yenCompact", align: "right" },
  ];
  const rows: Row[] = data.rows.map((r) => ({
    channel: r.name,
    kind: KIND[r.kind].label,
    kindTone: KIND[r.kind].tone,
    spend: r.spend,
    newCustomers: r.newCustomers,
    bookings: r.bookings,
    cpa: r.cpa,
    roas: r.roas,
    ltv: r.newCustomers > 0 ? r.revenue / r.newCustomers : 0,
    revenue: r.revenue,
  }));

  return (
    <>
      <PageHeader
        title="マーケティング"
        description="ホットペッパー等の媒体・自社チャネル別に、広告費・新規獲得・CPA・ROASを可視化。費用対効果の高い集客に投資配分できます。"
        chips={<Badge tone="brand">{filters.period === "thisMonth" ? "当月" : "選択期間"}</Badge>}
        actions={<PrintButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="広告費" value={data.totals.spend} format="yenCompact" icon={<Megaphone className="h-4 w-4" />} />
        <StatCard label="新規獲得数" value={data.totals.newCustomers} format="number" icon={<UserPlus className="h-4 w-4" />} />
        <StatCard label="平均CPA" value={data.blendedCpa} format="yen" icon={<Target className="h-4 w-4" />} hint="新規1人あたり獲得単価" />
        <StatCard label="ROAS" value={data.blendedRoas} format="decimal" icon={<TrendingUp className="h-4 w-4" />} hint="広告費に対する売上倍率" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-8" title="新規獲得の推移" subtitle="広告 / その他チャネル（直近12ヶ月）" icon={<TrendingUp className="h-[18px] w-[18px]" />}>
          <BarsChart
            data={data.trend}
            height={280}
            xFormat="month"
            yFormat="person"
            series={[
              { key: "paid", name: "広告経由", color: "#0f766e", stackId: "a" },
              { key: "other", name: "その他", color: "#94a3b8", stackId: "a" },
            ]}
          />
        </ChartCard>

        <ChartCard className="xl:col-span-4" title="獲得チャネル構成" subtitle="新規顧客の流入元">
          <DonutChart
            data={byKind}
            valueFormat="person"
            centerLabel="新規"
            centerValue={formatNumber(data.totals.newCustomers)}
          />
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-5" title="口コミ・評価" subtitle="Google / ホットペッパービューティー" icon={<Star className="h-[18px] w-[18px]" />}>
          <div className="grid grid-cols-2 gap-3">
            <Rating label="Google" value={data.reviews.googleRating} />
            <Rating label="ホットペッパー" value={data.reviews.hpbRating} />
            <ReviewStat label="総レビュー" value={`${formatNumber(data.reviews.totalReviews)}件`} />
            <ReviewStat label="当月新規" value={`+${formatNumber(data.reviews.monthlyNew)}`} />
          </div>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>口コミ返信率</span>
              <span className="tnum">{formatPercent(data.reviews.responseRate, 0)}</span>
            </div>
            <ProgressBar value={data.reviews.responseRate} tone="brand" />
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">返信率の高さは集客・再来に寄与します。低評価への迅速な対応が重要です。</p>
          </div>
        </ChartCard>
        <ChartCard className="xl:col-span-7" title="評価分布" subtitle="星別の口コミ件数">
          <BarsChart data={data.reviews.distribution.map((d) => ({ label: `★${d.star}`, count: d.count }))} height={230} yFormat="count" series={[{ key: "count", name: "件数", color: "#c0a060" }]} />
        </ChartCard>
      </div>

      <ChartCard className="mt-4" title="LINE公式・CRM" subtitle="友だち基盤と配信効果" icon={<MessageCircle className="h-[18px] w-[18px]" />}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <ReviewStat label="友だち数" value={`${formatNumber(data.line.friends)}人`} />
          <ReviewStat label="月間配信" value={`${data.line.monthlyBroadcast}回`} />
          <ReviewStat label="開封率" value={formatPercent(data.line.openRate, 0)} />
          <ReviewStat label="クリック率" value={formatPercent(data.line.clickRate, 0)} />
          <ReviewStat label="来店誘導" value={`${formatNumber(data.line.visitsDriven)}件`} />
          <ReviewStat label="ブロック率" value={formatPercent(data.line.blockRate, 1)} />
        </div>
      </ChartCard>

      <Card className="mt-4">
        <CardHeader title="チャネル別 効果" subtitle="費用対効果（CPA・ROAS・LTV）。列ヘッダーで並べ替え・絞り込み・CSV出力" icon={<Megaphone className="h-[18px] w-[18px]" />} />
        <div className="mt-1 pb-2">
          <SortableTable columns={cols} rows={rows} defaultSort="newCustomers" searchable exportName="チャネル別効果" />
        </div>
      </Card>
    </>
  );
}
