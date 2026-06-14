import { Ban, CalendarX, Coins, Receipt, TrendingDown } from "lucide-react";
import { BarsChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui/primitives";
import { getCancellations } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatDate, formatPercent } from "@/lib/format";

export const metadata = { title: "キャンセル料" };

export default function CancellationsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getCancellations(filters);
  const s = data.summary;

  const cols: Column[] = [
    { key: "name", label: "顧客", type: "text" },
    { key: "masked", label: "登録番号", type: "text", align: "center" },
    { key: "count", label: "キャンセル回数", type: "number", align: "right" },
    { key: "lastDate", label: "最終", type: "text", align: "center" },
    { key: "outstanding", label: "未回収", type: "yen", align: "right", signed: true, zeroDash: true },
  ];
  const rows: Row[] = data.offenders.map((o) => ({
    name: o.name,
    masked: o.masked,
    count: o.count,
    lastDate: formatDate(o.lastDate),
    outstanding: o.outstanding,
  }));

  return (
    <>
      <PageHeader
        title="キャンセル料・無断対策"
        description="Salon One のキャンセル料自動請求の結果を経営側で可視化。請求・回収率・未回収・機会損失と、常習者を把握します。"
        chips={<Badge tone="brand">当月</Badge>}
        actions={<PrintButton label="キャンセル資料を出力" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="キャンセル料 請求額" value={s.billed} format="yenCompact" icon={<Receipt className="h-4 w-4" />} hint="無断＋直前キャンセル" />
        <StatCard label="回収額" value={s.collected} format="yenCompact" icon={<Coins className="h-4 w-4" />} />
        <StatCard label="回収率" value={s.collectRate} format="percent" icon={<CalendarX className="h-4 w-4" />} help="請求済キャンセル料のうち回収できた割合です。" />
        <StatCard label="未回収" value={s.outstanding} format="yenCompact" invert icon={<Ban className="h-4 w-4" />} hint="要督促" />
        <StatCard label="機会損失（推定）" value={s.opportunityLoss} format="yenCompact" invert icon={<TrendingDown className="h-4 w-4" />} hint="埋め戻せなかった売上" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-8" title="キャンセル件数の推移" subtitle="直近12ヶ月の直前キャンセル・無断キャンセル" icon={<CalendarX className="h-[18px] w-[18px]" />}>
          <BarsChart
            data={data.trend}
            height={280}
            xFormat="month"
            yFormat="count"
            series={[
              { key: "cancellations", name: "直前キャンセル", color: "#c0a060", stackId: "a" },
              { key: "noShows", name: "無断キャンセル", color: "#f43f5e", stackId: "a" },
            ]}
          />
        </ChartCard>

        <ChartCard className="xl:col-span-4" title="発生率" subtitle="予約に対する割合">
          <div className="space-y-4 pt-1">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">直前キャンセル率</span>
                <span className="tnum font-semibold text-amber-600 dark:text-amber-400">{formatPercent(s.cancelRate)}</span>
              </div>
              <ProgressBar value={s.cancelRate / 0.12} tone="amber" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300">無断キャンセル率</span>
                <span className="tnum font-semibold text-rose-600 dark:text-rose-400">{formatPercent(s.noShowRate)}</span>
              </div>
              <ProgressBar value={s.noShowRate / 0.05} tone="rose" />
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              無断キャンセルは事前決済・デポジット・LINEリマインドで低減できます。キャンセルポリシーの掲示と自動請求の運用が回収率を左右します。
            </p>
          </div>
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardHeader title="キャンセル常習者" subtitle="複数回キャンセルの顧客（個人情報はマスキング）。並べ替え・CSV出力" icon={<Ban className="h-[18px] w-[18px]" />} />
        <div className="mt-1 pb-2">
          <SortableTable columns={cols} rows={rows} defaultSort="count" exportName="キャンセル常習者" />
        </div>
      </Card>
    </>
  );
}
