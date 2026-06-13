import { Building2, Store as StoreIcon, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { BarsChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, DeltaPill } from "@/components/ui/primitives";
import { getStores } from "@/lib/data";
import { buildQuery, parseFilters } from "@/lib/filters";
import { formatNumber, formatPercent, formatYen, formatYenCompact } from "@/lib/format";
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
        <CardHeader title="店舗一覧" subtitle="クリックで店舗詳細へ" />
        <div className="mt-2 overflow-x-auto px-2 pb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="th">店舗</th>
                <th className="th">エリア</th>
                <th className="th text-center">状態</th>
                <th className="th text-right">売上</th>
                <th className="th text-right">営業利益</th>
                <th className="th text-right">利益率</th>
                <th className="th text-right">客単価</th>
                <th className="th text-right">人時生産性</th>
                <th className="th text-right">{compareText}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((s) => (
                <tr key={s.id} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
                  <td className="td">
                    <Link href={`/stores/${s.id}${qs}`} className="flex items-center gap-2 font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.brandColor }} />
                      {s.name}
                    </Link>
                    <span className="ml-[18px] text-xs text-slate-400">{s.category}</span>
                  </td>
                  <td className="td text-slate-500">{s.prefecture}{s.area}</td>
                  <td className="td text-center"><Badge tone={SSTATUS[s.status].tone}>{SSTATUS[s.status].label}</Badge></td>
                  <td className="td text-right tnum">{formatYenCompact(s.revenue)}</td>
                  <td className={`td text-right tnum ${s.operatingProfit < 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>{formatYenCompact(s.operatingProfit)}</td>
                  <td className="td text-right tnum">{formatPercent(s.margin, 1)}</td>
                  <td className="td text-right tnum">{formatYen(s.ticket)}</td>
                  <td className="td text-right tnum">{formatYenCompact(s.revenuePerStaff)}</td>
                  <td className="td text-right"><div className="flex justify-end"><DeltaPill value={s.growth} bare /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
