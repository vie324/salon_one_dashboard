import { AlertTriangle, Boxes, Coins, Package, Percent, TrendingDown } from "lucide-react";
import { DonutChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { getInventory } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatYenCompact } from "@/lib/format";

export const metadata = { title: "在庫・発注" };

const STATUS: Record<"out" | "low" | "ok", { label: string; tone: "danger" | "warning" | "success" }> = {
  out: { label: "欠品", tone: "danger" },
  low: { label: "要発注", tone: "warning" },
  ok: { label: "適正", tone: "success" },
};

export default function InventoryPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getInventory(filters);

  const reorderCols: Column[] = [
    { key: "name", label: "品目", type: "entity" },
    { key: "status", label: "状態", type: "badge", align: "center" },
    { key: "stock", label: "在庫数", type: "number", align: "right" },
    { key: "reorderPoint", label: "適正在庫", type: "number", align: "right" },
    { key: "coverDays", label: "在庫日数", type: "decimal", align: "right", digits: 0, suffix: "日" },
    { key: "suggestedOrder", label: "発注推奨", type: "number", align: "right" },
    { key: "supplier", label: "仕入先", type: "text" },
    { key: "leadDays", label: "リードタイム", type: "decimal", align: "right", digits: 0, suffix: "日" },
  ];
  const reorderRows: Row[] = data.reorderAlerts.map((i) => ({
    name: i.name,
    status: STATUS[i.status].label,
    statusTone: STATUS[i.status].tone,
    stock: i.stock,
    reorderPoint: i.reorderPoint,
    coverDays: i.coverDays,
    suggestedOrder: i.suggestedOrder,
    supplier: i.supplier,
    leadDays: i.leadDays,
  }));

  const itemCols: Column[] = [
    { key: "name", label: "品目", type: "entity" },
    { key: "type", label: "区分", type: "badge", align: "center" },
    { key: "stock", label: "在庫数", type: "number", align: "right" },
    { key: "unit", label: "単位", type: "text", align: "center" },
    { key: "reorderPoint", label: "適正", type: "number", align: "right" },
    { key: "value", label: "在庫金額", type: "yenCompact", align: "right" },
    { key: "coverDays", label: "在庫日数", type: "decimal", align: "right", digits: 0, suffix: "日" },
    { key: "status", label: "状態", type: "badge", align: "center" },
    { key: "variance", label: "棚卸差異", type: "yen", align: "right", signed: true, zeroDash: true },
    { key: "supplier", label: "仕入先", type: "text" },
  ];
  const itemRows: Row[] = data.items.map((i) => ({
    name: i.name,
    type: i.type,
    typeTone: i.type === "材料" ? "info" : "brand",
    stock: i.stock,
    unit: i.unit,
    reorderPoint: i.reorderPoint,
    value: i.value,
    coverDays: i.coverDays,
    status: STATUS[i.status].label,
    statusTone: STATUS[i.status].tone,
    variance: i.variance,
    supplier: i.supplier,
  }));

  return (
    <>
      <PageHeader
        title="在庫・発注"
        description="材料・店販在庫の金額と発注点を管理。欠品・過剰を早期検知し、原価率・棚卸差異（ロス）まで把握します。"
        chips={<Badge tone={data.summary.reorderCount > 0 ? "warning" : "success"}>要発注 {data.summary.reorderCount} 品目</Badge>}
        actions={<PrintButton label="発注リストを出力" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="在庫総額" value={data.summary.totalValue} format="yenCompact" icon={<Boxes className="h-4 w-4" />} hint={`材料 ${formatYenCompact(data.summary.materialValue)} / 店販 ${formatYenCompact(data.summary.retailValue)}`} />
        <StatCard label="要発注品目" value={data.summary.reorderCount} format="number" icon={<AlertTriangle className="h-4 w-4" />} hint="発注点を下回った品目" />
        <StatCard label="当月仕入（原価）" value={data.summary.cogs} format="yenCompact" icon={<Coins className="h-4 w-4" />} />
        <StatCard label="原価率" value={data.summary.cogsRatio} format="percent" icon={<Percent className="h-4 w-4" />} help="売上原価 ÷ 売上高。低いほど利益率が高い指標です。" />
        <StatCard label="棚卸差異（ロス率）" value={data.summary.lossRate} format="percent" invert icon={<TrendingDown className="h-4 w-4" />} hint={`差異 ${formatYenCompact(data.summary.varianceTotal)}`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <CardHeader title="発注アラート" subtitle="在庫日数が短い順。並べ替え・絞り込み・CSV出力" icon={<AlertTriangle className="h-[18px] w-[18px]" />} />
          <div className="mt-1 pb-2">
            {reorderRows.length > 0 ? (
              <SortableTable columns={reorderCols} rows={reorderRows} defaultSort="coverDays" initialDir="asc" searchable exportName="発注リスト" />
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-400">発注が必要な品目はありません。</p>
            )}
          </div>
        </Card>

        <ChartCard className="xl:col-span-4" title="在庫構成" subtitle="材料 / 店販" icon={<Package className="h-[18px] w-[18px]" />}>
          <DonutChart data={data.byType} centerLabel="在庫総額" centerValue={formatYenCompact(data.summary.totalValue)} />
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardHeader title="在庫一覧" subtitle="全品目。並べ替え・絞り込み・CSV出力" icon={<Boxes className="h-[18px] w-[18px]" />} />
        <div className="mt-1 pb-2">
          <SortableTable columns={itemCols} rows={itemRows} defaultSort="value" searchable exportName="在庫一覧" />
        </div>
      </Card>
    </>
  );
}
