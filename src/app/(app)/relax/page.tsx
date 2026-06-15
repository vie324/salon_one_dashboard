import { Banknote, Clock, Hand, Ticket, UserCheck, Users } from "lucide-react";
import { DonutChart } from "@/components/charts/charts";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui/primitives";
import { getRelax } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatPercent, formatYenCompact } from "@/lib/format";

export const metadata = { title: "施術・委託（リラク）" };

export default function RelaxPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getRelax(filters);
  const s = data.summary;
  const e = data.employment;
  const totalEmp = e.directRevenue + e.outsourcedRevenue || 1;

  const cols: Column[] = [
    { key: "name", label: "コース", type: "text" },
    { key: "minutes", label: "時間", type: "decimal", align: "right", digits: 0, suffix: "分" },
    { key: "price", label: "料金", type: "yen", align: "right" },
    { key: "unitPerHour", label: "時間単価", type: "yen", align: "right" },
    { key: "revenue", label: "売上", type: "yenCompact", align: "right" },
  ];
  const rows: Row[] = data.courses.map((c) => ({ name: c.name, minutes: c.minutes, price: c.price, unitPerHour: c.unitPerHour, revenue: c.revenue }));

  return (
    <>
      <PageHeader
        title="施術・委託（リラク）"
        description="国家資格（あん摩マッサージ指圧）と資格外（リラクゼーション）の区分、分単位課金のコース別単価、業務委託セラピストの分配、回数券残高を管理します。"
        chips={<Badge tone="brand">国家資格 {(s.licensedRatio * 100).toFixed(0)}%</Badge>}
        actions={<PrintButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="売上" value={s.totalRev} format="yenCompact" icon={<Hand className="h-4 w-4" />} />
        <StatCard label="国家資格 売上" value={s.licensedRev} format="yenCompact" icon={<UserCheck className="h-4 w-4" />} help="あん摩マッサージ指圧師など国家資格者による施術。" />
        <StatCard label="資格外 売上" value={s.unlicensedRev} format="yenCompact" icon={<Users className="h-4 w-4" />} />
        <StatCard label="回数券残高" value={s.ticketBalance} format="yenCompact" icon={<Ticket className="h-4 w-4" />} hint="前受金（負債）" />
        <StatCard label="委託売上" value={s.outsourcedRevenue} format="yenCompact" icon={<Users className="h-4 w-4" />} />
        <StatCard label="委託分配額" value={s.payout} format="yenCompact" icon={<Banknote className="h-4 w-4" />} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-5" title="資格区分" subtitle="国家資格 / 資格外">
          <DonutChart data={data.qualSplit} centerLabel="売上" centerValue={formatYenCompact(s.totalRev)} />
        </ChartCard>

        <ChartCard className="xl:col-span-7" title="直雇用 / 業務委託" subtitle="セラピストの構成と分配" icon={<Users className="h-[18px] w-[18px]" />}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Mini label="直雇用 売上" value={formatYenCompact(e.directRevenue)} />
            <Mini label="委託 売上" value={formatYenCompact(e.outsourcedRevenue)} />
            <Mini label="委託者数" value={`${e.outsourcedCount}名`} />
            <Mini label="分配率" value={formatPercent(e.payoutRate, 0)} />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-400">
              <span>直雇用</span>
              <span>業務委託</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full">
              <div className="bg-brand-500" style={{ width: `${(e.directRevenue / totalEmp) * 100}%` }} />
              <div className="bg-gold-400" style={{ width: `${(e.outsourcedRevenue / totalEmp) * 100}%` }} />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">委託は売上連動の分配（{formatPercent(e.payoutRate, 0)}）が一般的。直雇用とのバランスが人件費の固定/変動比率を決めます。</p>
          </div>
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardHeader title="コース別（分単位課金）" subtitle="時間・料金・時間単価・売上。並べ替え・CSV出力" icon={<Clock className="h-[18px] w-[18px]" />} />
        <div className="mt-1 pb-2">
          <SortableTable columns={cols} rows={rows} defaultSort="revenue" exportName="リラクコース" />
        </div>
      </Card>
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold tnum text-slate-900 dark:text-slate-50">{value}</p>
    </div>
  );
}
