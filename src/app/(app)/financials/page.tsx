import { Landmark, Scale } from "lucide-react";
import { DonutChart, TrendChart } from "@/components/charts/charts";
import { CHART_COLORS } from "@/lib/colors";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, DeltaPill, ProgressBar } from "@/components/ui/primitives";
import { getFinancials } from "@/lib/data";
import type { PLLine } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatPercent, formatYen, formatYenCompact, formatYm } from "@/lib/format";

export const metadata = { title: "財務・PL" };

export default function FinancialsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getFinancials(filters);
  const compareText = filters.compare === "prevYear" ? "前年同期比" : "前期間比";

  const find = (k: string) => data.pl.find((l) => l.key === k)!;
  const revTotal = find("rev_total");
  const gross = find("gross");
  const operating = find("operating");
  const opexTotal = find("opex_total");

  const opexDonut = data.pl
    .filter((l) => l.kind === "opex")
    .map((l, i) => ({ name: l.label, value: l.amount, color: CHART_COLORS[i % CHART_COLORS.length] }));

  return (
    <>
      <PageHeader
        title="財務・損益計算書（PL）"
        description="月次PLを自動集計。前年比・構成比、損益分岐点、ブランド／店舗別の損益まで。税理士面談・役員会の資料としてPDF出力できます。"
        chips={<><Badge tone="brand">{data.period.label}</Badge><Badge tone="neutral">{compareText}</Badge></>}
        actions={<PrintButton label="PL資料を出力" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="売上高" value={revTotal.amount} format="yenCompact" delta={revTotal.delta} compareLabel={compareText} sparkColor="#6366f1" />
        <StatCard label="売上総利益" value={gross.amount} format="yenCompact" delta={gross.delta} compareLabel={compareText} hint={`粗利率 ${formatPercent(gross.ratio)}`} sparkColor="#14b8a6" />
        <StatCard label="営業利益" value={operating.amount} format="yenCompact" delta={operating.delta} compareLabel={compareText} sparkColor="#22c55e" />
        <StatCard label="営業利益率" value={operating.ratio} format="percent" delta={operating.ratio - operating.prev / (revTotal.prev || 1)} compareLabel={compareText} sparkColor="#0ea5e9" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* P&L statement */}
        <Card className="xl:col-span-8">
          <CardHeader title="損益計算書" subtitle={`対象: ${data.period.label} ／ 比較: ${data.period.compareLabel}`} icon={<Landmark className="h-[18px] w-[18px]" />} />
          <div className="mt-2 overflow-x-auto px-2 pb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="th">科目</th>
                  <th className="th text-right">金額</th>
                  <th className="th text-right">構成比</th>
                  <th className="th text-right">前年同期</th>
                  <th className="th text-right">前年比</th>
                </tr>
              </thead>
              <tbody>
                {data.pl.map((line) => (
                  <PLRow key={line.key} line={line} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* right column */}
        <div className="flex flex-col gap-4 xl:col-span-4">
          <ChartCard title="損益分岐点分析" subtitle="固定費・変動費から自動算出" icon={<Scale className="h-[18px] w-[18px]" />}>
            <div className="space-y-3">
              <KeyVal label="実績売上高" value={formatYen(data.breakeven.revenue)} strong />
              <KeyVal label="損益分岐点売上高" value={formatYen(data.breakeven.breakevenRevenue)} />
              <KeyVal label="固定費" value={formatYen(data.breakeven.fixed)} />
              <KeyVal label="変動費率" value={formatPercent(data.breakeven.variableRatio)} />
              <div className="pt-1">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-400">安全余裕率</span>
                  <span className="font-semibold tnum text-emerald-600 dark:text-emerald-400">{formatPercent(data.breakeven.marginOfSafety)}</span>
                </div>
                <ProgressBar value={data.breakeven.marginOfSafety} tone="emerald" />
                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">売上が損益分岐点をどれだけ上回っているかを示します。高いほど利益体質です。</p>
              </div>
            </div>
          </ChartCard>

          <ChartCard title="費用構成（販管費）" subtitle="コストの内訳">
            <DonutChart
              data={opexDonut}
              height={200}
              centerLabel="販管費計"
              centerValue={formatYenCompact(opexTotal.amount)}
            />
          </ChartCard>
        </div>
      </div>

      {/* profit trend */}
      <ChartCard className="mt-4" title="売上・利益の推移" subtitle="直近12ヶ月">
        <TrendChart
          data={data.trend}
          height={260}
          xFormat="month"
          series={[
            { key: "revenue", name: "売上高", color: "#6366f1", type: "area" },
            { key: "grossProfit", name: "売上総利益", color: "#14b8a6", type: "line" },
            { key: "operatingProfit", name: "営業利益", color: "#22c55e", type: "line" },
          ]}
        />
      </ChartCard>

      {/* by brand / by store */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="ブランド別 損益" subtitle="営業利益順" />
          <PLBreakdownTable
            rows={data.byBrand.map((b) => ({ id: b.id, name: b.name, color: b.color, revenue: b.revenue, operatingProfit: b.operatingProfit, margin: b.margin }))}
          />
        </Card>
        <Card>
          <CardHeader title="店舗別 損益" subtitle="営業利益順" />
          <PLBreakdownTable
            rows={data.byStore.map((s) => ({ id: s.id, name: s.name, color: s.brandColor, revenue: s.revenue, operatingProfit: s.operatingProfit, margin: s.margin }))}
          />
        </Card>
      </div>
    </>
  );
}

function PLRow({ line }: { line: PLLine }) {
  const isCost = line.kind === "cogs" || line.kind === "opex" || line.key === "opex_total";
  const subtotal = line.kind === "subtotal";
  const result = line.kind === "result";
  return (
    <tr
      className={
        result
          ? "bg-brand-50/60 dark:bg-brand-500/10"
          : subtotal
            ? "border-t border-slate-200 dark:border-slate-700"
            : "border-b border-slate-50 dark:border-slate-800/40"
      }
    >
      <td className={`td ${line.indent ? "pl-8 text-slate-500 dark:text-slate-400" : "font-semibold text-slate-800 dark:text-slate-100"} ${result ? "text-brand-700 dark:text-brand-300" : ""}`}>
        {line.label}
      </td>
      <td className={`td text-right tnum ${subtotal || result ? "font-bold text-slate-900 dark:text-slate-50" : "text-slate-700 dark:text-slate-300"}`}>
        {formatYen(line.amount)}
      </td>
      <td className="td text-right tnum text-xs text-slate-400">{formatPercent(line.ratio, 1)}</td>
      <td className="td text-right tnum text-xs text-slate-400">{formatYen(line.prev)}</td>
      <td className="td text-right"><div className="flex justify-end"><DeltaPill value={line.delta} invert={isCost} bare /></div></td>
    </tr>
  );
}

function KeyVal({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`tnum ${strong ? "text-base font-bold text-slate-900 dark:text-slate-50" : "text-sm font-medium text-slate-700 dark:text-slate-200"}`}>{value}</span>
    </div>
  );
}

function PLBreakdownTable({
  rows,
}: {
  rows: { id: string; name: string; color: string; revenue: number; operatingProfit: number; margin: number }[];
}) {
  return (
    <div className="mt-2 overflow-x-auto px-2 pb-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="th">名称</th>
            <th className="th text-right">売上</th>
            <th className="th text-right">営業利益</th>
            <th className="th text-right">利益率</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
              <td className="td">
                <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  {r.name}
                </span>
              </td>
              <td className="td text-right tnum">{formatYenCompact(r.revenue)}</td>
              <td className={`td text-right tnum ${r.operatingProfit < 0 ? "text-rose-600 dark:text-rose-400" : ""}`}>{formatYenCompact(r.operatingProfit)}</td>
              <td className="td text-right tnum">{formatPercent(r.margin, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
