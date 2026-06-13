import { CheckCircle2, CircleAlert, Scale, Search } from "lucide-react";
import { DonutChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { getReconciliation } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatNumber, formatYen, formatYenCompact } from "@/lib/format";
import type { ReconStatus } from "@/lib/types";

export const metadata = { title: "入金・突合" };

const RSTATUS: Record<ReconStatus, { label: string; tone: "success" | "warning" | "danger"; color: string }> = {
  matched: { label: "一致", tone: "success", color: "#22c55e" },
  investigating: { label: "確認中", tone: "warning", color: "#f59e0b" },
  unmatched: { label: "未解決", tone: "danger", color: "#f43f5e" },
};

export default function ReconciliationPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getReconciliation(filters);
  const total = data.summary.matched + data.summary.investigating + data.summary.unmatched;

  return (
    <>
      <PageHeader
        title="入金・突合（消込）"
        description="Salon One 上の売上記録と、各決済代行からの実入金・レジ現金を自動照合。差異を検知し、確認中／未解決をステータス管理します。"
        chips={<Badge tone="brand">当月</Badge>}
        actions={<PrintButton label="突合表を出力" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="一致" value={data.summary.matched} format="number" icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} hint={`全${total}件中`} />
        <StatCard label="確認中" value={data.summary.investigating} format="number" icon={<Search className="h-4 w-4 text-amber-500" />} hint="手数料・返金など" />
        <StatCard label="未解決" value={data.summary.unmatched} format="number" icon={<CircleAlert className="h-4 w-4 text-rose-500" />} hint="要対応" />
        <StatCard label="差異合計（絶対値）" value={data.summary.diffAbs} format="yenCompact" icon={<Scale className="h-4 w-4" />} hint="解消すべき金額" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-4" title="突合ステータス" subtitle="件数構成">
          <DonutChart
            data={[
              { name: "一致", value: data.summary.matched, color: "#22c55e" },
              { name: "確認中", value: data.summary.investigating, color: "#f59e0b" },
              { name: "未解決", value: data.summary.unmatched, color: "#f43f5e" },
            ]}
            valueFormat="count"
            centerLabel="件数"
            centerValue={`${total}`}
          />
        </ChartCard>

        <Card className="xl:col-span-8">
          <CardHeader title="決済手段別 突合" subtitle="記録額・入金額・差異" />
          <div className="mt-2 overflow-x-auto px-2 pb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="th">手段</th>
                  <th className="th text-right">件数</th>
                  <th className="th text-right">売上記録</th>
                  <th className="th text-right">実入金</th>
                  <th className="th text-right">差異</th>
                </tr>
              </thead>
              <tbody>
                {data.byMethod.map((m) => (
                  <tr key={m.method} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
                    <td className="td font-medium text-slate-800 dark:text-slate-100">{m.label}</td>
                    <td className="td text-right tnum">{m.count}</td>
                    <td className="td text-right tnum">{formatYenCompact(m.recorded)}</td>
                    <td className="td text-right tnum">{formatYenCompact(m.settled)}</td>
                    <td className={`td text-right tnum font-semibold ${m.diff < 0 ? "text-rose-600 dark:text-rose-400" : m.diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                      {m.diff === 0 ? "—" : formatYen(m.diff)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* detail */}
      <Card className="mt-4">
        <CardHeader
          title="突合明細"
          subtitle="差異の大きい順。クリックで該当伝票へ（連携後）。"
          actions={<span className="text-xs text-slate-400">{data.rows.length} 件</span>}
        />
        <div className="mt-2 overflow-x-auto px-2 pb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="th">日付</th>
                <th className="th">店舗</th>
                <th className="th">手段 / 代行</th>
                <th className="th text-right">売上記録</th>
                <th className="th text-right">実入金</th>
                <th className="th text-right">差異</th>
                <th className="th text-center">状況</th>
                <th className="th">メモ</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.id} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
                  <td className="td tnum text-slate-500">{r.date.slice(5)}</td>
                  <td className="td font-medium text-slate-800 dark:text-slate-100">{r.storeName}</td>
                  <td className="td text-slate-500">
                    <div>{r.methodLabel}</div>
                    <div className="text-xs text-slate-400">{r.processorName}</div>
                  </td>
                  <td className="td text-right tnum">{formatYen(r.recorded)}</td>
                  <td className="td text-right tnum">{formatYen(r.settled)}</td>
                  <td className={`td text-right tnum font-semibold ${r.diff < 0 ? "text-rose-600 dark:text-rose-400" : r.diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}`}>
                    {r.diff === 0 ? "—" : formatYen(r.diff)}
                  </td>
                  <td className="td text-center"><Badge tone={RSTATUS[r.status].tone}>{RSTATUS[r.status].label}</Badge></td>
                  <td className="td text-xs text-slate-400">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
