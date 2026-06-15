import { Clock, Gauge, Repeat, RotateCcw, Users } from "lucide-react";
import { BarsChart, DonutChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui/primitives";
import { getMembership } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatPercent, formatYenCompact } from "@/lib/format";
import { CHART_COLORS } from "@/lib/colors";

export const metadata = { title: "定額制・回転" };

export default function MembershipPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getMembership(filters);
  const s = data.summary;

  const cols: Column[] = [
    { key: "name", label: "プラン", type: "text" },
    { key: "price", label: "月額", type: "yen", align: "right" },
    { key: "members", label: "会員数", type: "number", align: "right" },
    { key: "mrr", label: "MRR", type: "yenCompact", align: "right" },
  ];
  const rows: Row[] = data.plans.map((p) => ({ name: p.name, price: p.price, members: p.members, mrr: p.mrr }));
  const donut = data.plans.map((p, i) => ({ name: p.name, value: p.mrr, color: CHART_COLORS[i % CHART_COLORS.length] }));

  return (
    <>
      <PageHeader
        title="定額制・回転（ネイル / アイラッシュ）"
        description="通い放題・月額の定額制プランの会員とMRR、施術の回転率・席稼働、アイラッシュのリペア比率を可視化。定額制の採算を管理します。"
        chips={<Badge tone="brand">会員 {s.members.toLocaleString("ja-JP")} 名</Badge>}
        actions={<PrintButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="定額会員数" value={s.members} format="number" icon={<Users className="h-4 w-4" />} />
        <StatCard label="MRR" value={s.mrr} format="yenCompact" icon={<Repeat className="h-4 w-4" />} />
        <StatCard label="継続率" value={s.retentionRate} format="percent" icon={<RotateCcw className="h-4 w-4" />} />
        <StatCard label="平均利用回数/月" value={s.avgVisitsPerMonth} format="decimal" icon={<Repeat className="h-4 w-4" />} help="定額会員の月間平均利用回数。原価との採算管理に使います。" />
        <StatCard label="1日回転数" value={s.turnoverPerDay} format="decimal" icon={<Gauge className="h-4 w-4" />} />
        <StatCard label="席稼働率" value={s.seatOccupancy} format="percent" icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-7" title="定額会員数の推移" subtitle="直近12ヶ月" icon={<Users className="h-[18px] w-[18px]" />}>
          <BarsChart data={data.memberTrend} height={260} xFormat="month" yFormat="person" series={[{ key: "members", name: "会員数", color: "#0f766e" }]} />
        </ChartCard>

        <ChartCard className="xl:col-span-5" title="プラン別 MRR" subtitle="売上構成">
          <DonutChart data={donut} centerLabel="MRR" centerValue={formatYenCompact(s.mrr)} />
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader title="プラン一覧" subtitle="月額・会員数・MRR。並べ替え・CSV出力" icon={<Repeat className="h-[18px] w-[18px]" />} />
          <div className="mt-1 pb-2">
            <SortableTable columns={cols} rows={rows} defaultSort="mrr" exportName="定額プラン" />
          </div>
        </Card>

        <ChartCard className="xl:col-span-5" title="回転・リペア" subtitle="生産性と採算">
          <div className="space-y-4 pt-1">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">席稼働率</span>
                <span className="tnum font-semibold">{formatPercent(s.seatOccupancy)}</span>
              </div>
              <ProgressBar value={s.seatOccupancy} tone="brand" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">リペア比率（アイラッシュ）</span>
                <span className="tnum font-semibold text-gold-600">{formatPercent(s.repeatRatio)}</span>
              </div>
              <ProgressBar value={s.repeatRatio} tone="amber" />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              平均施術時間 {s.avgServiceMinutes} 分／回。定額制は利用回数×原価が月額を上回ると赤字化するため、回転率と利用頻度の管理が採算の鍵です。
            </p>
          </div>
        </ChartCard>
      </div>
    </>
  );
}
