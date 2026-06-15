import { Award, Coins, Percent, Scissors, Users } from "lucide-react";
import { DonutChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { getStylists } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatYenCompact } from "@/lib/format";

export const metadata = { title: "スタイリスト・歩合" };

const RANK_TONE: Record<string, "brand" | "info" | "warning" | "neutral"> = {
  ディレクター: "brand",
  トップスタイリスト: "info",
  スタイリスト: "warning",
  ジュニア: "neutral",
};

export default function StylistsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getStylists(filters);
  const s = data.summary;

  const cols: Column[] = [
    { key: "name", label: "スタイリスト", type: "text" },
    { key: "store", label: "店舗", type: "text" },
    { key: "rank", label: "ランク", type: "badge", align: "center" },
    { key: "sales", label: "技術売上", type: "yenCompact", align: "right" },
    { key: "designationRate", label: "指名率", type: "percent", align: "right" },
    { key: "commissionRate", label: "歩合率", type: "percent", align: "right" },
    { key: "commission", label: "想定歩合", type: "yenCompact", align: "right" },
  ];
  const rows: Row[] = data.rows.map((r) => ({
    name: r.name,
    store: r.store,
    rank: r.rank,
    rankTone: RANK_TONE[r.rank],
    sales: r.sales,
    designationRate: r.designationRate,
    commissionRate: r.commissionRate,
    commission: r.commission,
  }));

  return (
    <>
      <PageHeader
        title="スタイリスト・歩合（ヘア）"
        description="指名率・ランク別の歩合給、面貸し/業務委託（フリーランス美容師）の売上分配を可視化。人件費（歩合）と生産性を最適化します。"
        chips={<Badge tone="brand">{s.stylistCount} 名</Badge>}
        actions={<PrintButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="技術売上" value={s.totalSales} format="yenCompact" icon={<Scissors className="h-4 w-4" />} />
        <StatCard label="想定歩合総額" value={s.commissionTotal} format="yenCompact" icon={<Coins className="h-4 w-4" />} hint="ランク別歩合率" />
        <StatCard label="平均指名率" value={s.designationAvg} format="percent" icon={<Award className="h-4 w-4" />} />
        <StatCard label="スタイリスト数" value={s.stylistCount} format="number" icon={<Users className="h-4 w-4" />} />
        <StatCard label="薬剤原価率" value={s.drugCostRatio} format="percent" icon={<Percent className="h-4 w-4" />} help="カラー剤等の材料費 ÷ 売上。ロス管理が重要です。" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-5" title="ランク構成" subtitle="スタイリストの階層">
          <DonutChart data={data.rankDist} valueFormat="count" centerLabel="人数" centerValue={`${s.stylistCount}`} />
        </ChartCard>

        <ChartCard className="xl:col-span-7" title="面貸し・業務委託" subtitle="フリーランス美容師の分配" icon={<Users className="h-[18px] w-[18px]" />}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="委託美容師" value={`${data.freelance.count}名`} />
            <Mini label="委託売上" value={formatYenCompact(data.freelance.revenue)} />
            <Mini label="面貸し料収入" value={formatYenCompact(data.freelance.chairFee)} tone="text-emerald-600 dark:text-emerald-400" />
            <Mini label="美容師取り分" value={formatYenCompact(data.freelance.payout)} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            面貸し（席貸し）は固定の席料収入、業務委託は売上連動の分配が一般的。直雇用とのバランスが人件費と採用戦略を左右します。
          </p>
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardHeader title="スタイリスト一覧" subtitle="ランク・指名率・歩合。並べ替え・絞り込み・CSV出力" icon={<Award className="h-[18px] w-[18px]" />} />
        <div className="mt-1 pb-2">
          <SortableTable columns={cols} rows={rows} defaultSort="sales" searchable exportName="スタイリスト歩合" />
        </div>
      </Card>
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
