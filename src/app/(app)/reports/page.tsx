import { FileSpreadsheet, FileText, Landmark, Receipt, Wallet } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { Card } from "@/components/ui/primitives";
import { presetGrowth, targetFor } from "@/lib/budget";
import { getBudget, getCashflow, getFinancials, getOverview, getStores } from "@/lib/data";
import { buildQuery, parseFilters } from "@/lib/filters";
import { formatPercent, formatValue, formatYen, formatYenCompact } from "@/lib/format";

export const metadata = { title: "レポート出力" };

const TEMPLATES = [
  { id: "monthly", label: "月次経営レポート", icon: FileText, desc: "全社サマリー・PL・ブランド別実績" },
  { id: "board", label: "役員会資料", icon: FileSpreadsheet, desc: "KPI・予実・店舗ランキング" },
  { id: "tax", label: "税理士提出資料（PL・試算表）", icon: Landmark, desc: "勘定科目別・前年比・消費税区分" },
  { id: "cashflow", label: "資金繰り表", icon: Wallet, desc: "入出金予定・前受金・残高見込" },
  { id: "store", label: "店舗別実績レポート", icon: Receipt, desc: "店舗ごとの売上・損益" },
];

export default function ReportsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const tplParam = Array.isArray(searchParams.tpl) ? searchParams.tpl[0] : searchParams.tpl;
  const tpl = TEMPLATES.some((t) => t.id === tplParam) ? (tplParam as string) : "monthly";
  const base = buildQuery(filters);
  const tplHref = (id: string) => (base ? `${base}&tpl=${id}` : `?tpl=${id}`);

  const overview = getOverview(filters);
  const fin = getFinancials(filters);
  const cash = getCashflow(filters);
  const stores = getStores(filters);
  const budget = getBudget(filters);
  const compareText = filters.compare === "prevYear" ? "前年同期比" : "前期間比";
  const meta = TEMPLATES.find((t) => t.id === tpl)!;

  return (
    <>
      <PageHeader
        title="レポート・資料作成"
        description="経営会議・税理士面談・役員会向けの資料を自動生成。テンプレートを選び、期間・対象を指定してPDF出力できます。"
        actions={<PrintButton label="PDFで出力" />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-3 print:hidden">
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">テンプレート</h3>
            <div className="space-y-1.5">
              {TEMPLATES.map((t) => {
                const active = t.id === tpl;
                return (
                  <Link
                    key={t.id}
                    href={tplHref(t.id)}
                    className={`flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition ${active ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-slate-50 dark:hover:bg-slate-800/60"}`}
                  >
                    <t.icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-brand-600 dark:text-brand-300" : "text-slate-400"}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${active ? "text-brand-700 dark:text-brand-300" : "text-slate-700 dark:text-slate-200"}`}>{t.label}</p>
                      <p className="text-[11px] text-slate-400">{t.desc}</p>
                    </div>
                  </Link>
                );
              })}
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

        <div className="lg:col-span-9">
          <div className="mx-auto max-w-3xl rounded-card border border-slate-200 bg-white p-8 text-slate-900 shadow-card print:border-0 print:shadow-none sm:p-10">
            <div className="flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-brand-600">Salon One Holdings</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight">{meta.label}</h1>
                <p className="mt-1 text-sm text-slate-500">対象期間：{fin.period.label} ／ 比較：{compareText}</p>
              </div>
              <div className="text-right text-xs text-slate-400">
                <p>作成日：{overview.today.date}</p>
                <p>株式会社サロンワン・ホールディングス</p>
              </div>
            </div>

            {tpl === "monthly" && <MonthlyDoc overview={overview} fin={fin} cash={cash} stores={stores} compareText={compareText} />}
            {tpl === "board" && <BoardDoc overview={overview} stores={stores} budget={budget} compareText={compareText} />}
            {tpl === "tax" && <TaxDoc fin={fin} compareText={compareText} />}
            {tpl === "cashflow" && <CashflowDoc cash={cash} fin={fin} />}
            {tpl === "store" && <StoreDoc stores={stores} compareText={compareText} />}

            <p className="mt-8 border-t border-slate-200 pt-4 text-center text-[11px] text-slate-400">
              本資料は Salon One 経営ダッシュボードにより自動生成されました。
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function MonthlyDoc({ overview, fin, cash, stores, compareText }: any) {
  return (
    <>
      <Section no="1" title="エグゼクティブサマリー">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {overview.kpis.slice(0, 6).map((k: any) => (
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
      <Section no="2" title="損益計算書（要約）">
        <PlTable fin={fin} compareText={compareText} compact />
      </Section>
      <Section no="3" title="ブランド別実績">
        <SimpleTable head={["ブランド", "売上", "営業利益", "利益率"]} rows={fin.byBrand.map((b: any) => [b.name, formatYenCompact(b.revenue), formatYenCompact(b.operatingProfit), formatPercent(b.margin, 1)])} dot={fin.byBrand.map((b: any) => b.color)} />
      </Section>
      <Section no="4" title="資金・顧客サマリー">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DocStat label="現金売上(当月)" value={formatYenCompact(cash.headline.cashSales)} />
          <DocStat label="入金予定(純額)" value={formatYenCompact(cash.headline.depositScheduled)} />
          <DocStat label="前受金残高" value={formatYenCompact(cash.prepaid.balance)} />
          <DocStat label="サブスクMRR" value={formatYenCompact(cash.subscription.mrr)} />
        </div>
      </Section>
      <Section no="5" title="特記事項・所見">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>営業利益率は{formatPercent(overview.summary.operatingMargin)}。{compareText}で増減要因を確認。</li>
          <li>要対応アラート {overview.alerts.length} 件（突合差異・入金遅延・赤字店舗等）。</li>
          <li>店舗数 {stores.totals.stores} 店、総スタッフ {stores.totals.staff} 名。</li>
          <li className="text-slate-400">（コメント記入欄）</li>
        </ul>
      </Section>
    </>
  );
}

function BoardDoc({ overview, stores, budget, compareText }: any) {
  const g = presetGrowth("standard");
  const revTarget = budget.brands.reduce((s: number, b: any) => s + targetFor("revenue", b.baseline.revenue, g[b.category as keyof typeof g]), 0);
  const profitTarget = budget.brands.reduce((s: number, b: any) => s + targetFor("profit", b.baseline.profit, g[b.category as keyof typeof g]), 0);
  const revActual = budget.company.actual.revenue;
  const profitActual = budget.company.actual.profit;
  const top = [...stores.rows].sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 8);
  return (
    <>
      <Section no="1" title="全社KPI">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {overview.kpis.map((k: any) => (
            <div key={k.key} className="rounded-lg border border-slate-100 p-3">
              <p className="text-[11px] text-slate-500">{k.label}</p>
              <p className="mt-0.5 text-base font-bold tnum">{formatValue(k.value, k.format)}</p>
              <p className={`text-xs tnum ${k.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{k.delta >= 0 ? "+" : ""}{(k.delta * 100).toFixed(1)}%</p>
            </div>
          ))}
        </div>
      </Section>
      <Section no="2" title="予実サマリー（標準シナリオ）">
        <SimpleTable
          head={["指標", "目標", "実績(着地)", "達成率"]}
          rows={[
            ["売上高", formatYenCompact(revTarget), formatYenCompact(revActual), formatPercent(revTarget ? revActual / revTarget : 0, 0)],
            ["営業利益", formatYenCompact(profitTarget), formatYenCompact(profitActual), formatPercent(profitTarget ? profitActual / profitTarget : 0, 0)],
          ]}
        />
      </Section>
      <Section no="3" title="店舗ランキング（売上上位）">
        <SimpleTable
          head={["#", "店舗", "売上", "営業利益", compareText]}
          rows={top.map((s: any, i: number) => [String(i + 1), s.name, formatYenCompact(s.revenue), formatYenCompact(s.operatingProfit), `${s.growth >= 0 ? "+" : ""}${(s.growth * 100).toFixed(1)}%`])}
        />
      </Section>
    </>
  );
}

function TaxDoc({ fin, compareText }: any) {
  const pl: Record<string, number> = Object.fromEntries(fin.pl.map((l: any) => [l.key, l.amount]));
  const taxableSales = pl.rev_total ?? 0;
  const salesTax = taxableSales * 0.1;
  const taxablePurchase = (pl.cogs ?? 0) + (pl.utilities ?? 0) + (pl.advertising ?? 0) + (pl.fees ?? 0) + (pl.other ?? 0) + (pl.rent ?? 0);
  const purchaseTax = taxablePurchase * 0.1;
  return (
    <>
      <Section no="1" title="損益計算書（試算表）">
        <PlTable fin={fin} compareText={compareText} />
      </Section>
      <Section no="2" title="消費税区分（概算・税抜表示）">
        <SimpleTable
          head={["区分", "対象額", "消費税(10%)"]}
          rows={[
            ["課税売上高", formatYen(taxableSales), formatYen(salesTax)],
            ["課税仕入高", formatYen(taxablePurchase), formatYen(purchaseTax)],
            ["差引（納付見込）", "—", formatYen(salesTax - purchaseTax)],
          ]}
        />
      </Section>
      <Section no="3" title="注記">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>金額は税抜・概算です。適格請求書（インボイス）区分・軽減税率は連携後に厳密化します。</li>
          <li>人件費・減価償却費は課税仕入に含めていません。</li>
          <li className="text-slate-400">（顧問税理士確認欄）</li>
        </ul>
      </Section>
    </>
  );
}

function CashflowDoc({ cash, fin }: any) {
  const pl: Record<string, number> = Object.fromEntries(fin.pl.map((l: any) => [l.key, l.amount]));
  const inflow = pl.rev_total ?? 0;
  const outflows: [string, number][] = [
    ["人件費", pl.labor ?? 0],
    ["地代家賃", pl.rent ?? 0],
    ["売上原価（仕入）", pl.cogs ?? 0],
    ["広告宣伝費", pl.advertising ?? 0],
    ["支払手数料", pl.fees ?? 0],
    ["その他・水道光熱", (pl.other ?? 0) + (pl.utilities ?? 0)],
  ];
  const totalOut = outflows.reduce((s, [, v]) => s + v, 0);
  const net = inflow - totalOut;
  return (
    <>
      <Section no="1" title="入金（収入）見込">
        <SimpleTable head={["区分", "金額"]} rows={[["売上収入（期間）", formatYen(inflow)], ["うち入金予定(未収・純額)", formatYen(cash.headline.depositScheduled)]]} />
      </Section>
      <Section no="2" title="出金（支出）見込">
        <SimpleTable head={["費目", "金額"]} rows={outflows.map(([l, v]) => [l, formatYen(v)]).concat([["支出計", formatYen(totalOut)]])} />
      </Section>
      <Section no="3" title="収支・前受金">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DocStat label="ネット収支" value={formatYenCompact(net)} />
          <DocStat label="決済手数料" value={formatYenCompact(cash.headline.feesTotal)} />
          <DocStat label="前受金残高" value={formatYenCompact(cash.prepaid.balance)} />
          <DocStat label="サブスクMRR" value={formatYenCompact(cash.subscription.mrr)} />
        </div>
      </Section>
    </>
  );
}

function StoreDoc({ stores, compareText }: any) {
  return (
    <Section no="1" title="店舗別実績">
      <SimpleTable
        head={["店舗", "売上", "営業利益", "利益率", "客単価", compareText]}
        rows={stores.rows.map((s: any) => [s.name, formatYenCompact(s.revenue), formatYenCompact(s.operatingProfit), formatPercent(s.margin, 1), formatYen(s.ticket), `${s.growth >= 0 ? "+" : ""}${(s.growth * 100).toFixed(1)}%`])}
        dot={stores.rows.map((s: any) => s.brandColor)}
      />
    </Section>
  );
}

function PlTable({ fin, compareText, compact }: any) {
  const lines = compact ? fin.pl.filter((l: any) => !l.indent || ["labor", "rent", "advertising", "cogs"].includes(l.key)) : fin.pl;
  return (
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
        {lines.map((l: any) => (
          <tr key={l.key} className={l.kind === "result" ? "bg-brand-50/70" : "border-b border-slate-50"}>
            <td className={`py-1.5 ${l.indent ? "pl-4 text-slate-500" : "font-semibold"} ${l.kind === "result" ? "text-brand-700" : ""}`}>{l.label}</td>
            <td className={`py-1.5 text-right tnum ${l.kind === "subtotal" || l.kind === "result" ? "font-bold" : ""}`}>{formatYen(l.amount)}</td>
            <td className="py-1.5 text-right tnum text-xs text-slate-400">{formatPercent(l.ratio, 1)}</td>
            <td className={`py-1.5 text-right tnum text-xs ${l.delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{l.delta >= 0 ? "+" : ""}{(l.delta * 100).toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SimpleTable({ head, rows, dot }: { head: string[]; rows: string[][]; dot?: string[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-xs text-slate-400">
          {head.map((h, i) => (
            <th key={i} className={`py-1.5 font-medium ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, ri) => (
          <tr key={ri} className="border-b border-slate-50">
            {r.map((c, ci) => (
              <td key={ci} className={`py-1.5 ${ci === 0 ? "text-left" : "text-right tnum"}`}>
                {ci === 0 && dot ? (
                  <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: dot[ri] }} />{c}</span>
                ) : (
                  c
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
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
