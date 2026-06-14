import { Award, BarChart3, CalendarClock, Users } from "lucide-react";
import { BarsChart } from "@/components/charts/charts";
import { Heatmap } from "@/components/charts/Heatmap";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, DeltaPill, ProgressBar } from "@/components/ui/primitives";
import { getSales } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatPercent, formatYen, formatYenCompact } from "@/lib/format";

export const metadata = { title: "売上・実績" };

export default function SalesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getSales(filters);
  const h = data.headline;
  const compareText = filters.compare === "prevYear" ? "前年同期比" : "前期間比";
  const maxBrandRev = Math.max(...data.brandRows.map((b) => b.revenue), 1);

  const menuCols: Column[] = [
    { key: "label", label: "メニュー", type: "text" },
    { key: "amount", label: "売上", type: "yenCompact", align: "right" },
    { key: "grossProfit", label: "粗利", type: "yenCompact", align: "right" },
    { key: "marginRate", label: "粗利率", type: "percent", align: "right" },
  ];
  const menuRows: Row[] = data.menuMix.map((m) => ({ label: m.label, amount: m.amount, grossProfit: m.grossProfit, marginRate: m.marginRate }));

  const staffCols: Column[] = [
    { key: "name", label: "スタッフ", type: "text" },
    { key: "store", label: "店舗", type: "entity" },
    { key: "sales", label: "技術売上", type: "yenCompact", align: "right" },
    { key: "customers", label: "担当客数", type: "number", align: "right" },
    { key: "designationRate", label: "指名率", type: "percent", align: "right" },
    { key: "retentionRate", label: "再来率", type: "percent", align: "right" },
  ];
  const staffRows: Row[] = data.staff.map((s) => ({
    name: s.name,
    store: s.storeName,
    _color: s.brandColor,
    sales: s.sales,
    customers: s.customers,
    designationRate: s.designationRate,
    retentionRate: s.retentionRate,
  }));

  return (
    <>
      <PageHeader
        title="売上・実績分析"
        description="ブランド・店舗・スタッフ・メニュー・時間帯まで多角的に分析。新規/リピートの推移や指名率も把握できます。"
        chips={<><Badge tone="brand">{filters.period === "thisMonth" ? "当月" : "選択期間"}</Badge><Badge tone="neutral">{compareText}</Badge></>}
        actions={<PrintButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="売上高" value={h.revenue} format="yenCompact" delta={h.revenueDelta} compareLabel={compareText} sparkColor="#0f766e" />
        <StatCard label="客単価" value={h.ticket} format="yen" delta={h.ticketDelta} compareLabel={compareText} sparkColor="#a855f7" />
        <StatCard label="来店客数" value={h.customers} format="number" delta={h.customersDelta} compareLabel={compareText} sparkColor="#0ea5e9" />
        <StatCard label="リピート率" value={h.repeatRate} format="percent" hint={`技術売上比率 ${formatPercent(h.techShare, 0)}`} sparkColor="#22c55e" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader title="メニュー別 売上・粗利" subtitle="上位カテゴリ（粗利率つき）" icon={<BarChart3 className="h-[18px] w-[18px]" />} />
          <div className="mt-1 pb-2">
            <SortableTable columns={menuCols} rows={menuRows} defaultSort="amount" exportName="メニュー別売上" />
          </div>
        </Card>

        <ChartCard className="xl:col-span-7" title="新規 / リピート 推移" subtitle="直近12ヶ月の来店客数構成" icon={<Users className="h-[18px] w-[18px]" />}>
          <BarsChart
            data={data.nrTrend}
            height={300}
            xFormat="month"
            yFormat="person"
            series={[
              { key: "repeat", name: "リピート", color: "#0f766e", stackId: "a" },
              { key: "new", name: "新規", color: "#f59e0b", stackId: "a" },
            ]}
          />
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader title="ブランド別 実績" subtitle="売上・客単価・成長率" />
          <div className="mt-2 overflow-x-auto px-2 pb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="th">ブランド</th>
                  <th className="th">構成</th>
                  <th className="th text-right">売上</th>
                  <th className="th text-right">客単価</th>
                  <th className="th text-right">{compareText}</th>
                </tr>
              </thead>
              <tbody>
                {data.brandRows.map((b) => (
                  <tr key={b.id} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
                    <td className="td">
                      <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                        {b.name}
                      </span>
                      <span className="ml-[18px] text-xs text-slate-400">{b.category}</span>
                    </td>
                    <td className="td w-32">
                      <ProgressBar value={b.revenue / maxBrandRev} />
                    </td>
                    <td className="td text-right tnum">{formatYenCompact(b.revenue)}</td>
                    <td className="td text-right tnum">{formatYen(b.ticket)}</td>
                    <td className="td text-right"><div className="flex justify-end"><DeltaPill value={b.growth} bare /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <ChartCard className="xl:col-span-5" title="予約ヒートマップ" subtitle="曜日 × 時間帯の予約集中度" icon={<CalendarClock className="h-[18px] w-[18px]" />}>
          <Heatmap days={data.heatmap.days} hours={data.heatmap.hours} matrix={data.heatmap.matrix} />
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardHeader title="スタッフ成績ランキング" subtitle="個人売上・指名率・再来率。並べ替え・絞り込み・CSV出力" icon={<Award className="h-[18px] w-[18px]" />} />
        <div className="mt-1 pb-2">
          <SortableTable columns={staffCols} rows={staffRows} defaultSort="sales" searchable exportName="スタッフ成績" />
        </div>
      </Card>
    </>
  );
}
