import { ClipboardList, CreditCard, PiggyBank, Percent, RefreshCcw, ShieldCheck } from "lucide-react";
import { DonutChart, TrendChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui/primitives";
import { getCourses } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatYenCompact } from "@/lib/format";

export const metadata = { title: "役務・コース管理" };

const PAY_TONE: Record<string, "neutral" | "info" | "brand"> = { 一括: "neutral", 信販: "info", 都度: "brand" };
const STATUS_TONE: Record<string, "brand" | "info" | "danger" | "warning"> = { 進行中: "brand", 完了: "info", 解約: "danger", 失効: "warning" };

export default function CoursesPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getCourses(filters);
  const s = data.summary;
  const maxShinpan = Math.max(...data.shinpanByCompany.map((x) => x.balance), 1);

  const cols: Column[] = [
    { key: "customer", label: "顧客", type: "entity" },
    { key: "store", label: "店舗", type: "text" },
    { key: "course", label: "コース", type: "text" },
    { key: "contractAmount", label: "契約額", type: "yenCompact", align: "right" },
    { key: "consumption", label: "消化率", type: "percent", align: "right" },
    { key: "remaining", label: "残額（前受金）", type: "yenCompact", align: "right" },
    { key: "paymentType", label: "支払", type: "badge", align: "center" },
    { key: "expiry", label: "有効期限", type: "text", align: "center" },
    { key: "status", label: "状態", type: "badge", align: "center" },
  ];
  const rows: Row[] = data.contracts.map((c) => ({
    customer: c.customer,
    _sub: c.masked,
    store: c.store,
    course: c.course,
    contractAmount: c.contractAmount,
    consumption: c.consumption,
    remaining: c.remaining,
    paymentType: c.paymentType,
    paymentTypeTone: PAY_TONE[c.paymentType],
    expiry: c.expiryDate.slice(0, 7),
    status: c.status,
    statusTone: STATUS_TONE[c.status],
  }));

  return (
    <>
      <PageHeader
        title="役務・コース管理（エステ）"
        description="コース契約の前受金（役務）残高と消化、中途解約・クーリングオフ・返金、信販（立替金）を一元管理します。前受金は負債計上のため、残高と消化ペースの把握が会計・資金繰りの要です。"
        chips={<Badge tone="brand">{s.activeCount} 進行中</Badge>}
        actions={<PrintButton label="役務資料を出力" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="前受金残高（役務）" value={s.prepaidBalance} format="yenCompact" icon={<PiggyBank className="h-4 w-4" />} help="未消化のコース契約額。会計上は負債（前受金）として計上します。" />
        <StatCard label="進行中 契約" value={s.activeCount} format="number" icon={<ClipboardList className="h-4 w-4" />} />
        <StatCard label="当月 消化額" value={s.consumedThisMonth} format="yenCompact" icon={<RefreshCcw className="h-4 w-4" />} hint="役務提供で売上計上" />
        <StatCard label="解約件数" value={s.cancelCount} format="number" invert icon={<ShieldCheck className="h-4 w-4" />} hint={`返金 ${formatYenCompact(s.refundTotal)}`} />
        <StatCard label="信販 立替残高" value={s.shinpanBalance} format="yenCompact" icon={<CreditCard className="h-4 w-4" />} />
        <StatCard label="平均消化率" value={s.avgConsumption} format="percent" icon={<Percent className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-4" title="契約ステータス" subtitle="件数構成">
          <DonutChart data={data.byStatus} valueFormat="count" centerLabel="契約数" centerValue={`${data.contracts.length}`} />
        </ChartCard>
        <ChartCard className="xl:col-span-4" title="支払方法別 前受金残高" subtitle="一括 / 信販 / 都度">
          <DonutChart data={data.byPayment} centerLabel="残高" centerValue={formatYenCompact(s.prepaidBalance)} />
        </ChartCard>
        <ChartCard className="xl:col-span-4" title="役務残高の消化見込" subtitle="今後6ヶ月の前受金残高（試算）" icon={<RefreshCcw className="h-[18px] w-[18px]" />}>
          <TrendChart data={data.projection} height={200} xFormat="month" yFormat="yenCompact" series={[{ key: "balance", name: "前受金残高", color: "#c0a060", type: "area" }]} />
        </ChartCard>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-5" title="中途解約・クーリングオフ" subtitle="特定商取引法への対応" icon={<ShieldCheck className="h-[18px] w-[18px]" />}>
          <div className="grid grid-cols-3 gap-3">
            <Mini label="解約件数" value={`${s.cancelCount}件`} />
            <Mini label="返金総額" value={formatYenCompact(s.refundTotal)} tone="text-rose-600 dark:text-rose-400" />
            <Mini label="クーリングオフ" value={`${s.coolingOffCount}件`} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
            コース契約は概要書面・契約書面の交付義務があり、契約後8日以内はクーリングオフ（全額返金）の対象です。中途解約時は未消化分の精算と所定の違約金（上限あり）を計算します。
          </p>
        </ChartCard>

        <Card className="xl:col-span-7">
          <CardHeader title="信販会社別 立替残高" subtitle="ローン契約の与信・残高管理" icon={<CreditCard className="h-[18px] w-[18px]" />} />
          <div className="space-y-3 px-5 pb-5 pt-2">
            {data.shinpanByCompany.map((co) => (
              <div key={co.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{co.name}</span>
                  <span className="tnum text-slate-600 dark:text-slate-300">{formatYenCompact(co.balance)}</span>
                </div>
                <ProgressBar value={co.balance / maxShinpan} tone="amber" />
              </div>
            ))}
            <p className="text-[11px] leading-relaxed text-slate-400">解約時は信販会社との立替金精算が発生します。与信枠・残債の管理が資金繰りに影響します。</p>
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title="コース契約 明細" subtitle="契約額・消化率・残額・有効期限。並べ替え・絞り込み・CSV出力" icon={<ClipboardList className="h-[18px] w-[18px]" />} />
        <div className="mt-1 pb-2">
          <SortableTable columns={cols} rows={rows} defaultSort="remaining" searchable exportName="コース契約明細" />
        </div>
      </Card>
    </>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tnum ${tone ?? "text-slate-900 dark:text-slate-50"}`}>{value}</p>
    </div>
  );
}
