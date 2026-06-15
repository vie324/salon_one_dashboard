import { Crown, Network, Percent, Store } from "lucide-react";
import { DonutChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { getFranchise } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatYenCompact } from "@/lib/format";

export const metadata = { title: "FC・のれん分け" };

export default function FranchisePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getFranchise(filters);
  const s = data.summary;

  const cols: Column[] = [
    { key: "name", label: "加盟店", type: "entity" },
    { key: "area", label: "エリア", type: "text" },
    { key: "owner", label: "オーナー", type: "text" },
    { key: "revenue", label: "売上", type: "yenCompact", align: "right" },
    { key: "royaltyRate", label: "料率", type: "percent", align: "right" },
    { key: "royalty", label: "ロイヤリティ", type: "yenCompact", align: "right" },
    { key: "openedYear", label: "開業", type: "text", align: "center" },
  ];
  const rows: Row[] = data.rows.map((r) => ({
    name: r.name,
    _color: r.color,
    area: r.area,
    owner: r.owner,
    revenue: r.revenue,
    royaltyRate: r.royaltyRate,
    royalty: r.royalty,
    openedYear: String(r.openedYear),
  }));
  const donut = data.rows.map((r) => ({ name: `${r.brand} ${r.area}`, value: r.royalty, color: r.color }));

  return (
    <>
      <PageHeader
        title="FC・のれん分け"
        description="フランチャイズ・のれん分け加盟店の売上とロイヤリティ収入（本部側）を可視化。加盟店別の実績を管理します。"
        chips={<Badge tone="brand">{s.count} 加盟店</Badge>}
        actions={<PrintButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="加盟店数" value={s.count} format="number" icon={<Store className="h-4 w-4" />} />
        <StatCard label="加盟店売上合計" value={s.totalRevenue} format="yenCompact" icon={<Network className="h-4 w-4" />} />
        <StatCard label="ロイヤリティ収入（本部）" value={s.totalRoyalty} format="yenCompact" icon={<Crown className="h-4 w-4" />} help="加盟店売上 × ロイヤリティ料率の合計。本部の収益です。" />
        <StatCard label="平均ロイヤリティ率" value={s.avgRoyaltyRate} format="percent" icon={<Percent className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader title="加盟店一覧" subtitle="売上・ロイヤリティ。並べ替え・絞り込み・CSV出力" icon={<Network className="h-[18px] w-[18px]" />} />
          <div className="mt-1 pb-2">
            <SortableTable columns={cols} rows={rows} defaultSort="royalty" searchable exportName="加盟店一覧" />
          </div>
        </Card>

        <ChartCard className="xl:col-span-4" title="ロイヤリティ構成" subtitle="加盟店別">
          <DonutChart data={donut} centerLabel="ロイヤリティ" centerValue={formatYenCompact(s.totalRoyalty)} />
        </ChartCard>
      </div>

      <Card className="mt-4 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">FC・のれん分けの運営メモ</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <li>ロイヤリティは売上連動が一般的（定額・定率の併用も可）。加盟店別の収益性をSV（スーパーバイザー）が管理します。</li>
          <li>のれん分けは独立支援の一形態。ブランド使用料・仕入の取りまとめで本部収益を確保します。</li>
          <li>連携後は加盟店の Salon One データから売上・ロイヤリティを自動集計します。</li>
        </ul>
      </Card>
    </>
  );
}
