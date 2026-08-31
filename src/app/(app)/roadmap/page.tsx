import { RoadmapBoard } from "@/components/roadmap/RoadmapBoard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { Badge } from "@/components/ui/primitives";
import { getRoadmap } from "@/lib/data";
import { weekRangeLabel } from "@/lib/roadmap";

export const metadata = { title: "開発ロードマップ" };

export default function RoadmapPage() {
  const data = getRoadmap();

  return (
    <>
      <PageHeader
        title="開発ロードマップ"
        description="中長期の開発スケジュールを週単位で管理します。今週進める項目は「開発進捗」の No.（#143 など）で紐づいており、週次MTGではこの画面をそのまま共有し、依頼メッセージをコピーして送れます。"
        chips={<Badge tone="brand">今週 {weekRangeLabel(data.currentWeek)}</Badge>}
        actions={<PrintButton label="ロードマップを出力" />}
      />
      <RoadmapBoard data={data} />
    </>
  );
}
