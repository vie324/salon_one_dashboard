import { Check, FileSpreadsheet, FileText, Landmark, Receipt, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { Badge, Card } from "@/components/ui/primitives";
import { getCashflow, getFinancials, getOverview, getStores } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatPercent, formatValue, formatYen, formatYenCompact } from "@/lib/format";

export const metadata = { title: "レポート出力" };

const TEMPLATES = [
  { id: "monthly", label: "月次経営レポート", icon: FileText, desc: "全社サマリー・PL・ブランド別実績", active: true },
  { id: "board", label: "役員会資料", icon: FileSpreadsheet, desc: "KPI推移・予実・店舗ランキング" },
  { id: "tax", label: "税理士提出資料（PL・試算表）", icon: Landmark, desc: "勘定科目別・前年比・消費税区分" },
  { id: "cashflow", label: "資金繰り表", icon: Wallet, desc: "入出金予定・前受金・残高見込" },
  { id: "store", label: "店舗別実績レポート", icon: Receipt, desc: "店舗ごとのPLと指標" },
];

export default function ReportsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const overview = getOverview(filters);
  const fin = getFinancials(filters);
  const cash = getCashflow(filters);
  const stores = getStores(filters);
  const compareText = filters.compare === "prevYear" ? "前年同期比" : "前期間比";

  return (
    <>
      <PageHeader
        title="レポート・資料作成"
        description="経営会議・税理士面談・役員会向けの資料を自動生成。テンプレートを選び、期間・対象を指定してPDF出力できます。"
        actions={<PrintButton label="PDFで出力" />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* template / settings panel */}
        <div className="space-y-4 lg:col-span-3 print:hidden">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">テンプレート</h3>
            <div className="space-y-1.5">
              {TEMPLATES.map((t) => (
                <div
                  key={t.id}
                  className={`flex items-start gap-2.5 rounded-xl px-2.5 py-2 ${t.active ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
                >
                  <t.icon className={`mt-0.5 h-4 w-4 shrink-0 ${t.active ? "text-brand-600 dark:text-brand-300" : "text-slate-400"}`} />
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${t.active ? "text-brand-700 dark:text-brand-300" : "text-slate-700 dark:text-slate-200"}`}>{t.label}</p>
                    <p className="text-[11px] text-slate-400">{t.desc}</p>
                  </div>
                  {t.active && <Check className="ml-auto h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">出力設定</h3>
            <dl className="space-y-2 text-sm">
              <Row label="対象期間" value={fin.period.label} />
              <Row label="比較基準" value={compareText} />
              <Row label="対象ブランド" value={filters.brandId === "all" ? "全ブランド" : filters.brandId} />
              <Row label="対象店舗" value={filters.storeId === "all" ? "全店舗" : filters.storeId} />
            </dl>
            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
              ※ 期間・対象は上部フィルタと連動します。出力形式は今後 Excel / 会計ソフト連携（freee・MFクラウド等）に対応予定。
            </p>
          </Card>
        </div>

        {/* document preview */}
        <div className="lg:col-span-9">
          <div className="mx-auto max-w-3xl rounded-card border border-slate-200 bg-white p-8 text-slate-900 shadow-card print:border-0 print:shadow-none sm:p-10">
            {/* doc header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-brand-600">Salon One Holdings</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">月次経営レポート</h1>
                <p className="mt-1 text-sm text-slate-500">対象期間：{fin.period.label} ／ 比較：{compareText}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>作成日：{overview.today.date}</p>
                <p>株式会社サロンワン・ホールディングス</p>
              </div>
            </div>

            {/* summary */}
            <Section no="1" title="エグゼクティブサマリー">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {overview.kpis.slice(0, 6).map((k) => (
                  <div key={k.key} className="rounded-lg border border-slate-100 p-3">
                    <p className="text-[11px] text-slate-500">{k.label}</p>
                    <p className="mt-0.5 text-lg font-bold tnum">{formatValue(k.value, k.format)}</p>
                    <p className={`text-xs tnum ${k.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {k.delta >= 0 ? "+" : ""}{(k.delta * 100).toFixed(1)}% <span className="text-slate-400">{compareText}</span>
                    </p>
                  </div>
                ))}
              </div>
            </Section>

            {/* PL */}
            <Section no="2" title="損益計算書（要約）">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-400">
                    <th className="py-1.5 text-left font-medium">科目</th>
                    <th className="py-1.5 text-right font-medium">金額</th>
                    <th className="py-1.5 text-right font-medium">構成比</th>
                    <th className="py-1.5 text-right font-medium">{compareText}</th>
                  </tr>
                </thead>
                <tbody>
                  {fin.pl.filter((l) => !l.indent || ["labor", "rent", "advertising", "cogs"].includes(l.key)).map((l) => (
                    <tr key={l.key} className={l.kind === "result" ? "bg-brand-50/70" : "border-b border-slate-50"}>
                      <td className={`py-1.5 ${l.indent ? "pl-4 text-slate-500" : "font-semibold"} ${l.kind === "result" ? "text-brand-700" : ""}`}>{l.label}</td>
                      <td className={`py-1.5 text-right tnum ${l.kind === "subtotal" || l.kind === "result" ? "font-bold" : ""}`}>{formatYen(l.amount)}</td>
                      <td className="py-1.5 text-right tnum text-xs text-slate-400">{formatPercent(l.ratio, 1)}</td>
                      <td className={`py-1.5 text-right tnum text-xs ${l.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{l.delta >= 0 ? "+" : ""}{(l.delta * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            {/* brand performance */}
            <Section no="3" title="ブランド別実績">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-400">
                    <th className="py-1.5 text-left font-medium">ブランド</th>
                    <th className="py-1.5 text-right font-medium">売上</th>
                    <th className="py-1.5 text-right font-medium">営業利益</th>
                    <th className="py-1.5 text-right font-medium">利益率</th>
                  </tr>
                </thead>
                <tbody>
                  {fin.byBrand.map((b) => (
                    <tr key={b.id} className="border-b border-slate-50">
                      <td className="py-1.5">
                        <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: b.color }} />{b.name}</span>
                      </td>
                      <td className="py-1.5 text-right tnum">{formatYenCompact(b.revenue)}</td>
                      <td className="py-1.5 text-right tnum">{formatYenCompact(b.operatingProfit)}</td>
                      <td className="py-1.5 text-right tnum">{formatPercent(b.margin, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>

            {/* cash & customers */}
            <Section no="4" title="資金・顧客サマリー">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DocStat label="現金売上(当月)" value={formatYenCompact(cash.headline.cashSales)} />
                <DocStat label="入金予定(純額)" value={formatYenCompact(cash.headline.depositScheduled)} />
                <DocStat label="前受金残高" value={formatYenCompact(cash.prepaid.balance)} />
                <DocStat label="サブスクMRR" value={formatYenCompact(cash.subscription.mrr)} />
              </div>
            </Section>

            {/* notes */}
            <Section no="5" title="特記事項・所見">
              <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                <li>営業利益率は{formatPercent(overview.summary.operatingMargin)}。{compareText}で増減要因を確認。</li>
                <li>要対応アラート {overview.alerts.length} 件（突合差異・入金遅延・赤字店舗等）。</li>
                <li>店舗数 {stores.totals.stores} 店、総スタッフ {stores.totals.staff} 名。</li>
                <li className="text-slate-400">（税理士コメント記入欄）</li>
              </ul>
            </Section>

            <p className="mt-8 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
              本資料は Salon One 経営ダッシュボードにより自動生成されました。
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ no, title, children }: { no: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="grid h-5 w-5 place-items-center rounded bg-brand-600 text-[11px] font-bold text-white">{no}</span>
        <h2 className="text-sm font-bold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function DocStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold tnum">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}
