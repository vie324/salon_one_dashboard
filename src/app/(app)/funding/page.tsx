import { Banknote, FileText, Landmark, ReceiptJapaneseYen } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader } from "@/components/ui/primitives";
import { getFunding } from "@/lib/data";
import { parseFilters } from "@/lib/filters";

export const metadata = { title: "資金調達・税務" };

const SUB_TONE: Record<string, "success" | "info" | "warning"> = {
  入金済: "success",
  採択: "info",
  申請中: "warning",
};

export default function FundingPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getFunding(filters);
  const s = data.summary;

  const loanCols: Column[] = [
    { key: "name", label: "借入", type: "text" },
    { key: "balance", label: "残高", type: "yenCompact", align: "right" },
    { key: "rate", label: "金利", type: "percent", align: "right" },
    { key: "monthlyPayment", label: "月次返済", type: "yenCompact", align: "right" },
    { key: "remainingMonths", label: "残回数", type: "decimal", align: "right", digits: 0, suffix: "回" },
  ];
  const loanRows: Row[] = data.loans.map((l) => ({ name: l.name, balance: l.balance, rate: l.rate, monthlyPayment: l.monthlyPayment, remainingMonths: l.remainingMonths }));

  const subCols: Column[] = [
    { key: "name", label: "補助金・助成金", type: "text" },
    { key: "amount", label: "金額", type: "yenCompact", align: "right" },
    { key: "status", label: "状況", type: "badge", align: "center" },
  ];
  const subRows: Row[] = data.subsidies.map((x) => ({ name: x.name, amount: x.amount, status: x.status, statusTone: SUB_TONE[x.status] }));

  return (
    <>
      <PageHeader
        title="資金調達・税務"
        description="借入金の残高・返済予定、補助金/助成金の申請・採択状況、消費税の納税予定（概算）を一元管理します。"
        actions={<PrintButton label="資料を出力" />}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="借入残高" value={s.loanBalance} format="yenCompact" icon={<Landmark className="h-4 w-4" />} />
        <StatCard label="月次返済額" value={s.monthlyRepayment} format="yenCompact" icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="補助金（採択・入金）" value={s.subsidyApproved} format="yenCompact" icon={<FileText className="h-4 w-4" />} hint={`申請中 ¥${Math.round(s.subsidyPending).toLocaleString("ja-JP")}`} />
        <StatCard label="消費税 納税予定（概算）" value={s.consumptionTaxDue} format="yenCompact" icon={<ReceiptJapaneseYen className="h-4 w-4" />} help="課税売上の消費税から課税仕入の消費税を控除した概算（税抜・原則）。" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader title="借入金・返済予定" subtitle="残高・金利・月次返済。並べ替え・CSV出力" icon={<Landmark className="h-[18px] w-[18px]" />} />
          <div className="mt-1 pb-2">
            <SortableTable columns={loanCols} rows={loanRows} defaultSort="balance" exportName="借入一覧" />
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader title="補助金・助成金" subtitle="申請・採択・入金の状況" icon={<FileText className="h-[18px] w-[18px]" />} />
          <div className="mt-1 pb-2">
            <SortableTable columns={subCols} rows={subRows} defaultSort="amount" exportName="補助金一覧" />
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">税務・制度対応メモ</h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          <li>適格請求書（インボイス）・軽減税率の区分は、連携後に取引データから自動判定します。</li>
          <li>電子帳簿保存法に対応し、証憑（領収書・請求書）の電子保管・検索要件を満たします。</li>
          <li>消費税は簡易課税／原則課税の選択により納税額が変わります。試算は概算です。</li>
        </ul>
      </Card>
    </>
  );
}
