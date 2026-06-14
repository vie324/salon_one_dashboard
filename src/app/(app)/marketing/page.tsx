import { Megaphone, Target, TrendingUp, UserPlus } from "lucide-react";
import { BarsChart, DonutChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { getMarketing } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatDecimal, formatNumber, formatYen, formatYenCompact, formatYm } from "@/lib/format";
import type { ChannelKind } from "@/lib/types";

export const metadata = { title: "マーケティング" };

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

      <Card className="mt-4">
        <CardHeader title="チャネル別 効果" subtitle="費用対効果（CPA・ROAS・LTV）。列ヘッダーで並べ替え・絞り込み・CSV出力" icon={<Megaphone className="h-[18px] w-[18px]" />} />
        <div className="mt-1 pb-2">
          <SortableTable columns={cols} rows={rows} defaultSort="newCustomers" searchable exportName="チャネル別効果" />
        </div>
      </Card>
    </>
  );
}
