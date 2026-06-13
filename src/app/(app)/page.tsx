import {
  AlertTriangle,
  ArrowUpRight,
  BadgeJapaneseYen,
  Banknote,
  CalendarDays,
  Info,
  TriangleAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { BarsChart, DonutChart, TrendChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, DeltaPill, EmptyState, ProgressBar } from "@/components/ui/primitives";
import { getOverview } from "@/lib/data";
import { buildQuery, parseFilters } from "@/lib/filters";
import {
  compactJa,
  formatDate,
  formatDateFull,
  formatNumber,
  formatPercent,
  formatYen,
  formatYenCompact,
  formatYm,
} from "@/lib/format";

const KPI_META: Record<string, { color: string; invert?: boolean }> = {
  revenue: { color: "#0f766e" },
  operatingProfit: { color: "#14b8a6" },
  customers: { color: "#0ea5e9" },
  ticket: { color: "#a855f7" },
  repeat: { color: "#22c55e" },
  occupancy: { color: "#0f766e" },
  cancel: { color: "#f43f5e", invert: true },
  newCustomers: { color: "#f59e0b" },
};

export default function OverviewPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getOverview(filters);
  const compareText = filters.compare === "prevYear" ? "前年同期比" : "前期間比";
  const qs = buildQuery(filters);
  const paymentTotal = data.paymentMix.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHeader
        title="経営ダッシュボード"
        description="全社の重要指標、資金、要対応事項をひと目で。期間・ブランド・店舗の切り替えは上部のフィルタから。"
        chips={
          <>
            <Badge tone="brand">{data.period.label.replace("-", "年") + (data.period.months === 1 ? "月" : "")}</Badge>
            <Badge tone="neutral">{compareText}</Badge>
          </>
        }
        actions={
          <>
            <span className="hidden text-xs text-slate-400 sm:block">最終更新 {formatDateFull(data.today.date)} 10:25</span>
            <PrintButton />
          </>
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {data.kpis.map((k) => {
          const meta = KPI_META[k.key] ?? { color: "#0f766e" };
          return (
            <StatCard
              key={k.key}
              label={k.label}
              value={k.value}
              format={k.format}
              delta={k.delta}
              invert={meta.invert}
              compareLabel={compareText}
              spark={k.spark}
              sparkColor={meta.color}
              hint={k.hint}
            />
          );
        })}
      </div>

      {/* Trend + Alerts */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-8"
          title="売上推移"
          subtitle={data.trend.granularity === "daily" ? "当月の日次推移（点線は着地見込）" : "月次推移：売上（面）と営業利益（線）"}
          actions={<Badge tone="neutral">{data.trend.granularity === "daily" ? "日次" : "月次"}</Badge>}
        >
          {data.trend.granularity === "daily" ? (
            <TrendChart
              data={data.trend.points}
              height={280}
              xFormat="day"
              referenceX={data.today.date}
              series={[
                { key: "actual", name: "売上（実績）", color: "#0f766e", type: "area" },
                { key: "forecast", name: "着地見込", color: "#a5acfb", type: "line", dashed: true },
              ]}
            />
          ) : (
            <TrendChart
              data={data.trend.points}
              height={280}
              xFormat="month"
              series={[
                { key: "value", name: "売上", color: "#0f766e", type: "area" },
                { key: "profit", name: "営業利益", color: "#14b8a6", type: "line" },
              ]}
            />
          )}
        </ChartCard>

        <Card className="flex flex-col xl:col-span-4">
          <CardHeader
            title="要対応アラート"
            subtitle="異常・未処理を自動検知"
            icon={<TriangleAlert className="h-[18px] w-[18px]" />}
            actions={<Badge tone={data.alerts.some((a) => a.level === "danger") ? "danger" : "warning"}>{data.alerts.length}</Badge>}
          />
          <div className="flex-1 space-y-1.5 px-3 pb-3 pt-3">
            {data.alerts.length === 0 && <EmptyState title="要対応の事項はありません" hint="すべて正常です" />}
            {data.alerts.map((a, i) => {
              const Icon = a.level === "danger" ? AlertTriangle : a.level === "warning" ? TriangleAlert : Info;
              const tone = a.level === "danger" ? "text-rose-500" : a.level === "warning" ? "text-amber-500" : "text-sky-500";
              return (
                <Link
                  key={i}
                  href={a.href + qs}
                  className="flex items-start gap-3 rounded-xl px-2.5 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
                >
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{a.detail}</p>
                  </div>
                  <ArrowUpRight className="ml-auto mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300" />
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Brand / Payment / Today + Profit */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-4" title="ブランド別 売上構成" subtitle={`${data.brandRows.length} ブランド`}>
          <DonutChart
            data={data.brandRows.map((b) => ({ name: b.name, value: b.revenue, color: b.color }))}
            centerLabel="売上合計"
            centerValue={formatYenCompact(data.summary.revenue)}
          />
          <div className="mt-3 space-y-2">
            {data.brandRows.map((b) => (
              <div key={b.id} className="flex items-center gap-2.5 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: b.color }} />
                <span className="truncate font-medium text-slate-700 dark:text-slate-200">{b.name}</span>
                <span className="text-xs text-slate-400">{b.category}</span>
                <span className="ml-auto tnum text-slate-600 dark:text-slate-300">{formatYenCompact(b.revenue)}</span>
                <span className="w-12 text-right text-xs tnum text-slate-400">{formatPercent(b.margin, 0)}</span>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard className="xl:col-span-4" title="決済手段別 売上" subtitle="現金・キャッシュレス内訳" icon={<Banknote className="h-[18px] w-[18px]" />}>
          <div className="space-y-3.5 pt-1">
            {data.paymentMix.map((p, i) => {
              const share = paymentTotal ? p.amount / paymentTotal : 0;
              return (
                <div key={p.method}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700 dark:text-slate-200">{p.label}</span>
                    <span className="tnum text-slate-600 dark:text-slate-300">
                      {formatYenCompact(p.amount)}
                      <span className="ml-1.5 text-xs text-slate-400">{formatPercent(share, 0)}</span>
                    </span>
                  </div>
                  <ProgressBar value={share} tone={i === 0 ? "brand" : i === 1 ? "sky" : i === 2 ? "emerald" : "amber"} />
                </div>
              );
            })}
          </div>
        </ChartCard>

        <div className="flex flex-col gap-4 xl:col-span-4">
          <ChartCard title="本日の状況" subtitle={formatDateFull(data.today.date)} icon={<CalendarDays className="h-[18px] w-[18px]" />} bodyClassName="pt-2">
            <div className="grid grid-cols-3 gap-3">
              <MiniStat label="本日売上" value={formatYenCompact(data.today.revenue)} icon={<BadgeJapaneseYen className="h-4 w-4" />} />
              <MiniStat label="来店客数" value={`${formatNumber(data.today.customers)}人`} icon={<Users className="h-4 w-4" />} />
              <MiniStat label="本日予約" value={`${formatNumber(data.today.reservations)}件`} icon={<CalendarDays className="h-4 w-4" />} />
            </div>
          </ChartCard>

          <ChartCard title="利益サマリー" subtitle={`営業利益率 ${formatPercent(data.summary.operatingMargin)}`}>
            <div className="space-y-3">
              <SummaryRow label="売上高" value={formatYen(data.summary.revenue)} />
              <SummaryRow label="売上総利益" value={formatYen(data.summary.grossProfit)} />
              <SummaryRow label="営業利益" value={formatYen(data.summary.operatingProfit)} strong />
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-400">
                  <span>営業利益率</span>
                  <span className="tnum">{formatPercent(data.summary.operatingMargin)}</span>
                </div>
                <ProgressBar value={data.summary.operatingMargin / 0.25} tone="emerald" />
              </div>
            </div>
          </ChartCard>
        </div>
      </div>

      {/* Store ranking */}
      <Card className="mt-4">
        <CardHeader
          title="店舗ランキング"
          subtitle="売上上位店舗と成長率"
          actions={<Link href={"/stores" + qs} className="btn btn-ghost btn-sm text-brand-600 dark:text-brand-300">すべて見る <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
        />
        <div className="mt-2 overflow-x-auto px-2 pb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="th w-10">#</th>
                <th className="th">店舗</th>
                <th className="th text-right">売上</th>
                <th className="th text-right">営業利益</th>
                <th className="th text-right">利益率</th>
                <th className="th text-right">{compareText}</th>
              </tr>
            </thead>
            <tbody>
              {data.topStores.map((s, i) => (
                <tr key={s.id} className="row-hover border-b border-slate-100 last:border-0 dark:border-slate-800/60">
                  <td className="td text-slate-400">{i + 1}</td>
                  <td className="td">
                    <Link href={`/stores/${s.id}${qs}`} className="flex items-center gap-2 font-medium text-slate-800 hover:text-brand-600 dark:text-slate-100">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.brandColor }} />
                      {s.name}
                    </Link>
                  </td>
                  <td className="td text-right tnum">{formatYenCompact(s.revenue)}</td>
                  <td className="td text-right tnum">{formatYenCompact(s.operatingProfit)}</td>
                  <td className="td text-right tnum">{formatPercent(s.margin, 1)}</td>
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

function MiniStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <div className="mb-1 text-slate-400">{icon}</div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold tnum text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${strong ? "font-semibold text-slate-800 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"}`}>{label}</span>
      <span className={`tnum ${strong ? "text-base font-bold text-slate-900 dark:text-slate-50" : "text-sm text-slate-700 dark:text-slate-200"}`}>{value}</span>
    </div>
  );
}
