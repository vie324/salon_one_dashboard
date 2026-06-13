import { Cable, CheckCircle2, Database, KeyRound, Link2, Plug, Webhook } from "lucide-react";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";

export const metadata = { title: "設定・連携" };

const MAPPING = [
  { dash: "売上・客数・予約・キャンセル", source: "予約管理 / 成績管理", api: "/api/overview, /api/sales" },
  { dash: "顧客・LTV・リピート・RFM", source: "顧客管理 / カルテ管理", api: "/api/customers" },
  { dash: "メニュー別売上", source: "カルテ / メニュー", api: "/api/sales" },
  { dash: "決済・入金・手数料", source: "決済 / キャンセル料自動請求", api: "/api/cashflow" },
  { dash: "売上 ↔ 入金 突合", source: "決済 / 各代行入金明細", api: "/api/reconciliation" },
  { dash: "PL（原価・人件費・家賃 等）", source: "会計連携 / 経費入力", api: "/api/financials" },
  { dash: "サブスク・前受金（役務）", source: "サブスク管理 / 役務管理", api: "/api/cashflow, /api/customers" },
  { dash: "集客チャネル", source: "媒体連携（ホットペッパー等）/ LINE", api: "/api/marketing" },
];

const METHODS = [
  { id: "rest", icon: Cable, title: "REST API（推奨）", desc: "Salon One の読み取りAPIをデータ層の各セレクタから呼び出し、ダッシュボードに反映。", recommended: true },
  { id: "webhook", icon: Webhook, title: "Webhook（イベント連携）", desc: "予約確定・決済・キャンセル等のイベントを受信し、集計をリアルタイム更新。" },
  { id: "batch", icon: Database, title: "バッチ / CSV取込", desc: "日次・月次でエクスポートを取り込み、突合やPLを再計算。" },
  { id: "replica", icon: Link2, title: "共有DB（リードレプリカ）", desc: "同一サーバ前提のため、参照用レプリカから直接集計する構成も可能。" },
];

const ROLES = [
  { role: "経営者 / 役員", scope: "全ブランド・全店舗の全指標、PL、資金", badge: "オーナー" },
  { role: "エリアマネージャー", scope: "担当エリアの売上・実績・店舗比較", badge: "管理者" },
  { role: "経理 / 財務", scope: "資金繰り・入金突合・PL・レポート出力", badge: "経理" },
  { role: "税理士（外部）", scope: "PL・試算表・レポートの閲覧／出力のみ", badge: "閲覧" },
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="設定・Salon One 連携"
        description="本ダッシュボードは現在デモデータで動作しています。データ層（src/lib/data）の各セレクタを Salon One API に差し替えることで、そのまま本番連携できます。"
        chips={<Badge tone="warning">デモデータ使用中</Badge>}
      />

      {/* connection */}
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
              <Plug className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Salon One API 連携</h3>
              <p className="text-sm text-slate-500">同一サーバー上の Salon One から経営データを取得します。</p>
            </div>
          </div>
          <Badge tone="neutral">未接続（連携方式は調整中）</Badge>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Labeled label="API ベースURL">
            <input className="input w-full" defaultValue="https://api.salonone.net/v1" readOnly />
          </Labeled>
          <Labeled label="APIキー / トークン">
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input w-full pl-8" type="password" defaultValue="••••••••••••••••" readOnly />
            </div>
          </Labeled>
        </div>
      </Card>

      {/* data mapping */}
      <Card className="mt-4">
        <CardHeader title="データ連携マッピング" subtitle="ダッシュボードの各データと Salon One 機能・APIエンドポイントの対応（連携差し込み口）" icon={<Cable className="h-[18px] w-[18px]" />} />
        <div className="mt-2 overflow-x-auto px-2 pb-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="th">ダッシュボード項目</th>
                <th className="th">Salon One 取得元</th>
                <th className="th">エンドポイント（差し替え対象）</th>
              </tr>
            </thead>
            <tbody>
              {MAPPING.map((m) => (
                <tr key={m.dash} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
                  <td className="td font-medium text-slate-800 dark:text-slate-100">{m.dash}</td>
                  <td className="td text-slate-500">{m.source}</td>
                  <td className="td"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-brand-700 dark:bg-slate-800 dark:text-brand-300">{m.api}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* methods */}
      <div className="mt-4">
        <h3 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">連携方式の選択肢</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {METHODS.map((m) => (
            <Card key={m.id} className={`p-5 ${m.recommended ? "ring-1 ring-brand-300 dark:ring-brand-500/40" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <m.icon className="h-[18px] w-[18px]" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{m.title}</h4>
                    {m.recommended && <Badge tone="brand">推奨</Badge>}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{m.desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* roles */}
      <ChartCard className="mt-4" title="メンバー・権限" subtitle="役割ごとの閲覧範囲（ロールベースアクセス制御）" icon={<CheckCircle2 className="h-[18px] w-[18px]" />}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="th">役割</th>
                <th className="th">閲覧範囲</th>
                <th className="th text-center">権限</th>
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => (
                <tr key={r.role} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
                  <td className="td font-medium text-slate-800 dark:text-slate-100">{r.role}</td>
                  <td className="td text-slate-500">{r.scope}</td>
                  <td className="td text-center"><Badge tone="neutral">{r.badge}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}
