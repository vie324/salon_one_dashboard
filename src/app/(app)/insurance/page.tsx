import { Clock, FileText, HeartPulse, Receipt, TrendingDown, Wallet } from "lucide-react";
import { DonutChart, TrendChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { getInsurance } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatYenCompact } from "@/lib/format";

export const metadata = { title: "保険診療・療養費" };

const ST: Record<string, "info" | "success" | "danger" | "warning"> = { 請求中: "info", 入金済: "success", 返戻: "danger", 査定: "warning" };

export default function InsurancePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getInsurance(filters);
  const s = data.summary;

  const cols: Column[] = [
    { key: "date", label: "日付", type: "text", align: "center" },
    { key: "insurer", label: "保険者", type: "text" },
    { key: "patient", label: "患者", type: "entity" },
    { key: "parts", label: "部位数", type: "number", align: "right" },
    { key: "amount", label: "請求額", type: "yen", align: "right" },
    { key: "status", label: "状態", type: "badge", align: "center" },
  ];
  const rows: Row[] = data.claims.map((c) => ({ date: c.date.slice(5), insurer: c.insurer, patient: c.patient, _sub: c.masked, parts: c.parts, amount: c.amount, status: c.status, statusTone: ST[c.status] }));

  return (
    <>
      <PageHeader
        title="保険診療・療養費（整体院）"
        description="柔道整復の療養費（受領委任払い）と自費診療を区分管理。請求・入金・返戻/査定・入金遅延、保険から自費への転換率を把握します。"
        chips={<Badge tone="brand">保険売上比率 {(s.insuranceRatio * 100).toFixed(0)}%</Badge>}
        actions={<PrintButton label="療養費資料を出力" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="療養費 請求額" value={s.billed} format="yenCompact" icon={<Receipt className="h-4 w-4" />} />
        <StatCard label="入金済" value={s.paid} format="yenCompact" icon={<Wallet className="h-4 w-4" />} hint="受領委任（2〜3ヶ月遅れ）" />
        <StatCard label="未入金（請求中）" value={s.pending} format="yenCompact" icon={<Clock className="h-4 w-4" />} />
        <StatCard label="返戻・査定減" value={s.returned + s.assessed} format="yenCompact" invert icon={<TrendingDown className="h-4 w-4" />} hint="要再請求・確認" />
        <StatCard label="自費転換率" value={s.jihiConversion} format="percent" icon={<HeartPulse className="h-4 w-4" />} help="保険患者が自費メニューに移行した割合です。" />
        <StatCard label="自費売上" value={s.jihiRev} format="yenCompact" icon={<FileText className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-8" title="保険 / 自費 売上推移" subtitle="直近12ヶ月" icon={<HeartPulse className="h-[18px] w-[18px]" />}>
          <TrendChart
            data={data.trend}
            height={280}
            xFormat="month"
            series={[
              { key: "insurance", name: "保険診療", color: "#0f766e", type: "area" },
              { key: "jihi", name: "自費診療", color: "#c0a060", type: "line" },
            ]}
          />
        </ChartCard>

        <ChartCard className="xl:col-span-4" title="未入金エイジング" subtitle="請求からの経過月数">
          <DonutChart data={data.aging} centerLabel="未入金" centerValue={formatYenCompact(s.pending)} />
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardHeader title="療養費 請求明細" subtitle="保険者・部位数・請求額・状態。並べ替え・絞り込み・CSV出力" icon={<Receipt className="h-[18px] w-[18px]" />} />
        <div className="mt-1 pb-2">
          <SortableTable columns={cols} rows={rows} defaultSort="amount" searchable exportName="療養費請求明細" />
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">運用メモ</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <li>受領委任払いは保険者への請求から入金まで2〜3ヶ月かかるため、資金繰りに織り込みが必要です。</li>
          <li>返戻（書類不備）・査定（減額）は再請求・確認が必要。負傷原因・部位数・同意書の管理が鍵です。</li>
          <li>保険診療から自費（骨盤矯正・鍼灸・自費リハビリ等）への転換が収益性を左右します。</li>
        </ul>
      </Card>
    </>
  );
}
