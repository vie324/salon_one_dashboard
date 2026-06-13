import { Award, BarChart3, CalendarClock, Users } from "lucide-react";
import { BarsChart } from "@/components/charts/charts";
import { Heatmap } from "@/components/charts/Heatmap";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, DeltaPill, ProgressBar } from "@/components/ui/primitives";
import { getSales } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatNumber, formatPercent, formatYen, formatYenCompact, formatYm } from "@/lib/format";

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
        <ChartCard className="xl:col-span-5" title="メニュー別 売上" subtitle="上位カテゴリ" icon={<BarChart3 className="h-[18px] w-[18px]" />}>
          <BarsChart
            data={data.menuMix}
            layout="vertical"
            height={300}
            series={[{ key: "amount", name: "売上", color: "#0f766e" }]}
          />
        </ChartCard>

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
        <CardHeader title="スタッフ成績ランキング" subtitle="個人売上・指名率・再来率" icon={<Award className="h-[18px] w-[18px]" />} actions={<span className="text-xs text-slate-400">上位 {data.staff.length} 名</span>} />
        <div className="mt-2 overflow-x-auto px-2 pb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="th w-10">#</th>
                <th className="th">スタッフ</th>
                <th className="th">店舗</th>
                <th className="th text-right">技術売上</th>
                <th className="th text-right">担当客数</th>
                <th className="th text-right">指名率</th>
                <th className="th text-right">再来率</th>
              </tr>
            </thead>
            <tbody>
              {data.staff.map((s, i) => (
                <tr key={s.id} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
                  <td className="td text-slate-400">{i + 1}</td>
                  <td className="td font-medium text-slate-800 dark:text-slate-100">{s.name}</td>
                  <td className="td">
                    <span className="flex items-center gap-2 text-slate-500">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.brandColor }} />
                      {s.storeName}
                    </span>
                  </td>
                  <td className="td text-right tnum">{formatYenCompact(s.sales)}</td>
                  <td className="td text-right tnum">{formatNumber(s.customers)}</td>
                  <td className="td text-right tnum">{formatPercent(s.designationRate, 0)}</td>
                  <td className="td text-right tnum">{formatPercent(s.retentionRate, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
