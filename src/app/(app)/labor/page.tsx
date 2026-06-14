import { Clock, Coins, Gauge, Percent, Users } from "lucide-react";
import { Heatmap } from "@/components/charts/Heatmap";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { getLabor } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatNumber, formatYenCompact } from "@/lib/format";

export const metadata = { title: "人時生産性・シフト" };

export default function LaborPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getLabor(filters);
  const s = data.summary;

  const cols: Column[] = [
    { key: "name", label: "店舗", type: "entity" },
    { key: "productivity", label: "人時生産性", type: "yen", align: "right" },
    { key: "laborShare", label: "労働分配率", type: "percent", align: "right" },
    { key: "laborCostRatio", label: "人件費率", type: "percent", align: "right" },
    { key: "staff", label: "在籍", type: "number", align: "right" },
    { key: "recommendedStaff", label: "推奨人員", type: "number", align: "right" },
    { key: "gap", label: "過不足", type: "number", align: "right", signed: true },
  ];
  const rows: Row[] = data.rows.map((r) => ({
    name: r.name,
    _color: r.brandColor,
    productivity: r.productivity,
    laborShare: r.laborShare,
    laborCostRatio: r.laborCostRatio,
    staff: r.staff,
    recommendedStaff: r.recommendedStaff,
    gap: r.gap,
  }));

  return (
    <>
      <PageHeader
        title="人時生産性・シフト"
        description="人時生産性・労働分配率・人件費率を可視化。需要予測（曜日×時間帯）から適正人員を見極め、人件費・歩合を最適化します。"
        chips={<Badge tone="brand">スタッフ {s.staffTotal} 名</Badge>}
        actions={<PrintButton />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="人時生産性" value={s.productivity} format="yen" icon={<Gauge className="h-4 w-4" />} help="売上 ÷ 総労働時間（人時）。1人1時間あたりの生み出す売上です。" />
        <StatCard label="労働分配率" value={s.laborShare} format="percent" icon={<Percent className="h-4 w-4" />} help="人件費 ÷ 売上総利益（付加価値）。適正水準の維持が重要です。" />
        <StatCard label="人件費率" value={s.laborCostRatio} format="percent" icon={<Users className="h-4 w-4" />} />
        <StatCard label="想定歩合（技術5%）" value={s.commissionTotal} format="yenCompact" icon={<Coins className="h-4 w-4" />} hint={`人件費 ${formatYenCompact(s.laborCost)}`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard className="xl:col-span-7" title="需要予測ヒートマップ" subtitle="曜日 × 時間帯の予約集中度（適正人員配置の指針）" icon={<Clock className="h-[18px] w-[18px]" />}>
          <Heatmap days={data.heatmap.days} hours={data.heatmap.hours} matrix={data.heatmap.matrix} />
        </ChartCard>

        <ChartCard className="xl:col-span-5" title="シフト最適化の考え方" subtitle="需要×人員の最適化">
          <ul className="list-inside list-disc space-y-2 pt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <li>金・土の夕方など<strong className="font-semibold">需要ピークに人員を厚く</strong>、閑散帯は薄く配置。</li>
            <li>人時生産性が低い店舗は、<strong className="font-semibold">人員過剰または客単価/回転に課題</strong>の可能性。</li>
            <li>労働分配率が高すぎる店舗は、<strong className="font-semibold">歩合設計や採用計画の見直し</strong>を検討。</li>
            <li className="text-slate-400">連携後は予約データから自動でシフト推奨を生成します。</li>
          </ul>
        </ChartCard>
      </div>

      <Card className="mt-4">
        <CardHeader title="店舗別 生産性・適正人員" subtitle="人時生産性・労働分配率と、需要から算出した推奨人員との差。並べ替え・絞り込み・CSV出力" icon={<Gauge className="h-[18px] w-[18px]" />} />
        <div className="mt-1 pb-2">
          <SortableTable columns={cols} rows={rows} defaultSort="productivity" searchable exportName="店舗別生産性" />
        </div>
      </Card>
    </>
  );
}
