import { BudgetBoard } from "@/components/budget/BudgetBoard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { Badge } from "@/components/ui/primitives";
import { getBudget } from "@/lib/data";
import { parseFilters } from "@/lib/filters";

export const metadata = { title: "予実・目標" };

export default function BudgetPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getBudget(filters);

  return (
    <>
      <PageHeader
        title="予実・目標管理"
        description="業態（ジャンル）や事業特性に合わせて成長シナリオと目標を設定し、目標・実績・着地見込・達成率・進捗ペースを管理します。設定はブラウザに自動保存され、期間・ブランド・店舗の切替に連動します。"
        chips={<Badge tone="brand">{data.period.label}</Badge>}
        actions={<PrintButton label="予実資料を出力" />}
      />
      <BudgetBoard data={data} />
    </>
  );
}
