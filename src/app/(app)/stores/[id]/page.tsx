import { ArrowLeft, MapPin, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DonutChart, TrendChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui/primitives";
import { CHART_COLORS } from "@/lib/colors";
import { getStoreDetail } from "@/lib/data";
import { buildQuery, parseFilters } from "@/lib/filters";
import { formatNumber, formatPercent, formatYen, formatYenCompact, formatYm } from "@/lib/format";

export default function StoreDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getStoreDetail(params.id, filters);
  if (!data) notFound();
  const qs = buildQuery(filters);
  const s = data.store;
  const compareText = filters.compare === "prevYear" ? "前年同期比" : "前期間比";
  const ticket = data.agg.customers ? data.agg.revenue / data.agg.customers : 0;
  const payTotal = data.paymentMix.reduce((a, p) => a + p.amount, 0);

  return (
    <>
      <Link href={"/stores" + qs} className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" /> 店舗一覧へ戻る
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="h-10 w-1.5 rounded-full" style={{ background: s.brandColor }} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{s.name}</h2>
              <Badge tone="brand">{s.brandName}</Badge>
              <Badge tone="neutral">{s.category}</Badge>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.prefecture}{s.area}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />スタッフ {s.staff}名 / 席数 {s.seats}</span>
              <span>店長: {s.manager}</span>
              <span>{s.openedYear}年開業</span>
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="売上高" value={data.agg.revenue} format="yenCompact" delta={data.deltas.revenue} compareLabel={compareText} sparkColor={s.brandColor} />
        <StatCard label="営業利益" value={data.agg.operatingProfit} format="yenCompact" delta={data.deltas.profit} compareLabel={compareText} sparkColor="#22c55e" />
        <StatCard label="来店客数" value={data.agg.customers} format="number" delta={data.deltas.customers} compareLabel={compareText} sparkColor="#0ea5e9" />
        <StatCard label="客単価" value={ticket} format="yen" hint={`新規 ${formatNumber(data.agg.newCustomers)}人`} sparkColor="#a855f7" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-8" title="売上・営業利益の推移" subtitle="直近12ヶ月">
          <TrendChart
            data={data.trend}
            height={260}
            xFormat="month"
            series={[
              { key: "revenue", name: "売上", color: s.brandColor, type: "area" },
              { key: "operatingProfit", name: "営業利益", color: "#22c55e", type: "line" },
            ]}
          />
        </ChartCard>

        <ChartCard className="xl:col-span-4" title="決済構成" subtitle="当該店舗">
          <DonutChart
            data={data.paymentMix.map((p, i) => ({ name: p.label, value: p.amount, color: CHART_COLORS[i % CHART_COLORS.length] }))}
            centerLabel="売上"
            centerValue={formatYenCompact(payTotal)}
          />
        </ChartCard>
      </div>

      <ChartCard className="mt-4" title="出店・投資回収（概算）" subtitle="内装・設備投資に対する回収状況" icon={<TrendingUp className="h-[18px] w-[18px]" />}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <InvStat label="初期投資（概算）" value={formatYenCompact(data.investment.initialInvestment)} />
          <InvStat label="月次営業利益" value={formatYenCompact(data.investment.monthlyProfit)} />
          <InvStat label="投資回収期間" value={`${Math.round(data.investment.paybackMonths)}ヶ月`} />
          <InvStat label="年間ROI" value={formatPercent(data.investment.annualRoi, 0)} />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-slate-400">
            <span>投資回収の進捗（開業 {Math.round(data.investment.monthsOpen / 12)} 年経過）</span>
            <span className="tnum">{formatPercent(Math.min(1, data.investment.recoveryRate), 0)}</span>
          </div>
          <ProgressBar value={data.investment.recoveryRate} tone={data.investment.recoveryRate >= 1 ? "emerald" : "brand"} />
          <p className="mt-2 text-[11px] text-slate-400">初期投資は席数ベースの概算です。回収済み（100%超）かどうかが、追加投資・改装・撤退判断の目安になります。</p>
        </div>
      </ChartCard>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader title="損益（PL）" subtitle={compareText} />
          <div className="mt-2 overflow-x-auto px-2 pb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="th">科目</th>
                  <th className="th text-right">金額</th>
                  <th className="th text-right">構成比</th>
                </tr>
              </thead>
              <tbody>
                {data.pl.map((l) => {
                  const subtotal = l.kind === "subtotal";
                  const result = l.kind === "result";
                  return (
                    <tr key={l.key} className={result ? "bg-brand-50/60 dark:bg-brand-500/10" : subtotal ? "border-t border-slate-200 dark:border-slate-700" : "border-b border-slate-50 dark:border-slate-800/40"}>
                      <td className={`td ${l.indent ? "pl-8 text-slate-500" : "font-semibold text-slate-800 dark:text-slate-100"} ${result ? "text-brand-700 dark:text-brand-300" : ""}`}>{l.label}</td>
                      <td className={`td text-right tnum ${subtotal || result ? "font-bold text-slate-900 dark:text-slate-50" : ""}`}>{formatYen(l.amount)}</td>
                      <td className="td text-right tnum text-xs text-slate-400">{formatPercent(l.ratio, 1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader title="スタッフ成績" subtitle="個人売上・指名率" />
          <div className="mt-2 overflow-x-auto px-2 pb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="th">スタッフ</th>
                  <th className="th text-right">技術売上</th>
                  <th className="th text-right">指名率</th>
                  <th className="th text-right">再来率</th>
                </tr>
              </thead>
              <tbody>
                {data.staff.map((st) => (
                  <tr key={st.id} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
                    <td className="td font-medium text-slate-800 dark:text-slate-100">{st.name}</td>
                    <td className="td text-right tnum">{formatYenCompact(st.sales)}</td>
                    <td className="td text-right tnum">{formatPercent(st.designationRate, 0)}</td>
                    <td className="td text-right tnum">{formatPercent(st.retentionRate, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

function InvStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold tnum text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}
