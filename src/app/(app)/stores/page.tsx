import { Building2, Store as StoreIcon, TrendingUp, Users } from "lucide-react";
import { BarsChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { getStores } from "@/lib/data";
import { buildQuery, parseFilters } from "@/lib/filters";
import type { StoreStatus } from "@/lib/types";

export const metadata = { title: "店舗管理" };

const SSTATUS: Record<StoreStatus, { label: string; tone: "success" | "warning" | "info" | "danger" }> = {
  open: { label: "営業中", tone: "success" },
  renovation: { label: "改装中", tone: "warning" },
  opening: { label: "新規開店", tone: "info" },
  closing: { label: "閉店準備", tone: "danger" },
};

export default function StoresPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getStores(filters);
  const qs = buildQuery(filters);
  const compareText = filters.compare === "prevYear" ? "前年同期比" : "前期間比";

  const cols: Column[] = [
    { key: "name", label: "店舗", type: "entity" },
    { key: "area", label: "エリア", type: "text" },
    { key: "status", label: "状態", type: "badge", align: "center" },
    { key: "revenue", label: "売上", type: "yenCompact", align: "right" },
    { key: "operatingProfit", label: "営業利益", type: "yenCompact", align: "right", signed: true },
    { key: "margin", label: "利益率", type: "percent", align: "right" },
    { key: "ticket", label: "客単価", type: "yen", align: "right" },
    { key: "revenuePerStaff", label: "人時生産性", type: "yenCompact", align: "right" },
    { key: "growth", label: compareText, type: "delta", align: "right" },
  ];
  const rows: Row[] = data.rows.map((s) => ({
    name: s.name,
    _color: s.brandColor,
    _href: `/stores/${s.id}${qs}`,
    _sub: s.category,
    area: `${s.prefecture}${s.area}`,
    status: SSTATUS[s.status].label,
    statusTone: SSTATUS[s.status].tone,
    revenue: s.revenue,
    operatingProfit: s.operatingProfit,
    margin: s.margin,
    ticket: s.ticket,
    revenuePerStaff: s.revenuePerStaff,
    growth: s.growth,
  }));

  return (
    <>
      <PageHeader
        title="店舗管理"
        description="多店舗・多ブランドの実績を横並びで比較。売上・利益率・成長率・人時生産性で、出店/改装/撤退の経営判断を支援します。"
        chips={<Badge tone="brand">{data.totals.stores} 店舗</Badge>}
        actions={<PrintButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="店舗数" value={data.totals.stores} format="number" icon={<StoreIcon className="h-4 w-4" />} />
        <StatCard label="売上合計" value={data.totals.revenue} format="yenCompact" icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="営業利益合計" value={data.totals.operatingProfit} format="yenCompact" icon={<Building2 className="h-4 w-4" />} />
        <StatCard label="総スタッフ数" value={data.totals.staff} format="number" icon={<Users className="h-4 w-4" />} />
      </div>

      <ChartCard className="mt-4" title="店舗別 売上" subtitle="期間内の売上比較">
        <BarsChart
          data={data.rows.map((r) => ({ name: r.name, revenue: r.revenue }))}
          layout="vertical"
          height={Math.max(280, data.rows.length * 30)}
          series={[{ key: "revenue", name: "売上", color: "#0f766e" }]}
        />
      </ChartCard>

      <Card className="mt-4">
        <CardHeader title="店舗一覧" subtitle="列ヘッダーで並べ替え・絞り込み・CSV出力" />
        <div className="mt-1 pb-2">
          <SortableTable columns={cols} rows={rows} defaultSort="revenue" searchable exportName="店舗別実績" />
        </div>
      </Card>
    </>
  );
}
