import {
  BadgeCheck,
  CalendarClock,
  Gift,
  HandCoins,
  Inbox,
  Link2,
  Percent,
  Users,
} from "lucide-react";
import { BarsChart } from "@/components/charts/charts";
import { FormLinkCard } from "@/components/referral/FormLinkCard";
import { RewardSimulator } from "@/components/referral/RewardSimulator";
import { ChartCard } from "@/components/ui/ChartCard";
import { PageHeader } from "@/components/ui/PageHeader";
import { PrintButton } from "@/components/ui/PrintButton";
import { SortableTable, type Column, type Row } from "@/components/ui/SortableTable";
import { StatCard } from "@/components/ui/StatCard";
import { Badge, Card, CardHeader } from "@/components/ui/primitives";
import { getReferral } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import { formatDate, formatPercent, formatYen } from "@/lib/format";
import { STATUS_TONE, jstDate } from "@/lib/referral";
import {
  CATEGORY_LABEL,
  CONTACT_METHOD_LABEL,
  CONTACT_SLOT_LABEL,
  REFERRAL_STATUS_LABEL,
  type ContactSlot,
  type ReferralLead,
} from "@/lib/types";

export const metadata = { title: "紹介制度" };

/** 「午前（10:00〜12:00）」→「午前」 */
function slotShort(slot: ContactSlot): string {
  return CONTACT_SLOT_LABEL[slot].replace(/（.*）/, "");
}

/** ご希望の連絡先（連絡方法にあわせて表示）。 */
function contactOf(l: ReferralLead): string {
  if (l.contactMethod === "line") return l.lineId ?? l.email ?? l.phone ?? "—";
  if (l.contactMethod === "email" || l.contactMethod === "online") return l.email ?? l.phone ?? "—";
  return l.phone ?? l.email ?? "—";
}

export default function ReferralPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters = parseFilters(searchParams);
  const data = getReferral(filters);
  const s = data.summary;

  const leadCols: Column[] = [
    { key: "date", label: "受付日", type: "text" },
    { key: "company", label: "申込サロン", type: "entity" },
    { key: "referrer", label: "紹介者", type: "text" },
    { key: "method", label: "連絡方法", type: "text" },
    { key: "contact", label: "連絡先", type: "text" },
    { key: "wish", label: "連絡希望日時", type: "text" },
    { key: "status", label: "状況", type: "badge" },
    { key: "reward", label: "紹介報酬", type: "yen", align: "right", zeroDash: true },
  ];

  const leadRows: Row[] = data.leads.map((l) => ({
    date: jstDate(l.submittedAt),
    company: l.companyName,
    _sub: `ご担当 ${l.contactName}・${l.storeCount}店舗・${l.categories.map((c) => CATEGORY_LABEL[c]).join("/")}`,
    referrer: `${l.referrerName}（${l.referrerSalon}）`,
    method: CONTACT_METHOD_LABEL[l.contactMethod],
    contact: contactOf(l),
    wish: `${formatDate(l.preferredDate1)} ${slotShort(l.preferredSlot1)}${
      l.preferredDate2 ? ` / ${formatDate(l.preferredDate2)} ${l.preferredSlot2 ? slotShort(l.preferredSlot2) : ""}` : ""
    }`,
    status: REFERRAL_STATUS_LABEL[l.status],
    statusTone: STATUS_TONE[l.status],
    reward: l.reward ?? 0,
  }));

  const referrerCols: Column[] = [
    { key: "name", label: "紹介者", type: "entity" },
    { key: "leads", label: "紹介数", type: "number", align: "right" },
    { key: "won", label: "成約", type: "number", align: "right" },
    { key: "reward", label: "報酬合計", type: "yen", align: "right", zeroDash: true },
  ];
  const referrerRows: Row[] = data.byReferrer.map((r) => ({
    name: r.name,
    _sub: r.salon,
    leads: r.leads,
    won: r.won,
    reward: r.reward,
  }));

  return (
    <>
      <PageHeader
        title="紹介制度"
        description="既存のお客様からのご紹介を管理します。紹介した側には初期費用の25%をお支払いし、紹介された側は初月の端数日数＋2ヶ月無料。お客様用の申込フォームURLはこのページから共有できます。"
        chips={
          <>
            <Badge tone="warning">未対応 {s.open} 件</Badge>
            <Badge tone="brand">紹介 {s.total} 件</Badge>
          </>
        }
        actions={<PrintButton />}
      />

      {/* ---- 制度の内容 ---- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card flex items-start gap-4 border-gold-200/80 bg-gold-50/40 p-5 dark:border-gold-500/25 dark:bg-gold-500/[0.07]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-gold-600 shadow-soft dark:bg-slate-900 dark:text-gold-400">
            <HandCoins className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-gold-700 dark:text-gold-300">紹介した側</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50">
              初期費用の <span className="tnum">{formatPercent(data.program.rewardRate, 0)}</span> をお支払い
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              お支払い時期：{data.program.rewardTiming}。未払いの報酬は {formatYen(s.rewardUnpaid)} です。
            </p>
          </div>
        </div>

        <div className="card flex items-start gap-4 border-brand-200/80 bg-brand-50/50 p-5 dark:border-brand-500/25 dark:bg-brand-500/[0.07]">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-soft dark:bg-slate-900 dark:text-brand-400">
            <Gift className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold text-brand-700 dark:text-brand-300">紹介された側</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900 dark:text-slate-50">
              初月の端数日数 ＋ <span className="tnum">{data.program.freeMonths}ヶ月</span> 無料
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              利用開始日から当月末までの日割り分と、その後 {data.program.freeMonths}ヶ月分が無料。付与済みの相当額は {formatYen(s.freeValueTotal)}。
            </p>
          </div>
        </div>
      </div>

      {/* ---- KPI ---- */}
      <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="紹介申込（累計）" value={s.total} format="number" icon={<Users className="h-4 w-4" />} />
        <StatCard label="今月の申込" value={s.thisMonth} format="number" icon={<Inbox className="h-4 w-4" />} />
        <StatCard
          label="未対応"
          value={s.open}
          format="number"
          icon={<CalendarClock className="h-4 w-4" />}
          help="お客様のご希望日時までにご連絡が必要な申込です。"
        />
        <StatCard label="成約" value={s.won} format="number" icon={<BadgeCheck className="h-4 w-4" />} />
        <StatCard
          label="成約率"
          value={s.winRate}
          format="percent"
          icon={<Percent className="h-4 w-4" />}
          help="成約 ÷（成約＋見送り）。対応中の申込は分母に含みません。"
        />
        <StatCard
          label="紹介報酬（累計）"
          value={s.rewardTotal}
          format="yenCompact"
          icon={<HandCoins className="h-4 w-4" />}
          hint={`未払い ${formatYen(s.rewardUnpaid)}`}
        />
      </div>

      {/* ---- フォームURL ---- */}
      <div className="mt-4">
        <FormLinkCard path={data.program.formPath} />
      </div>

      {/* ---- 推移・連絡方法 ---- */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <ChartCard
          className="xl:col-span-7"
          title="紹介申込と成約の推移"
          subtitle="直近7ヶ月"
          icon={<Inbox className="h-[18px] w-[18px]" />}
        >
          <BarsChart
            data={data.monthly}
            height={260}
            xFormat="month"
            yFormat="count"
            series={[
              { key: "leads", name: "申込", color: "#0f766e" },
              { key: "won", name: "成約", color: "#c0a060" },
            ]}
          />
        </ChartCard>
        <ChartCard
          className="xl:col-span-5"
          title="ご希望の連絡方法"
          subtitle="申込時に選ばれた手段（件数）"
          icon={<Link2 className="h-[18px] w-[18px]" />}
        >
          <BarsChart
            data={data.byMethod}
            xKey="name"
            layout="vertical"
            height={260}
            yFormat="count"
            series={[{ key: "value", name: "申込", color: "#0f766e" }]}
          />
        </ChartCard>
      </div>

      {/* ---- シミュレーター・対応状況 ---- */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <RewardSimulator className="xl:col-span-7" />
        <Card className="xl:col-span-5">
          <CardHeader
            title="対応状況"
            subtitle="ステータス別の件数"
            icon={<BadgeCheck className="h-[18px] w-[18px]" />}
          />
          <div className="space-y-3 px-5 pb-5 pt-4">
            {data.byStatus.map((st) => (
              <div key={st.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: st.color }} />
                    {st.name}
                  </span>
                  <span className="tnum font-semibold text-slate-800 dark:text-slate-100">{st.value} 件</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${s.total ? (st.value / s.total) * 100 : 0}%`, background: st.color }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-1 text-[11px] leading-relaxed text-slate-400">
              「未対応」はご希望の日時までにご連絡が必要な申込です。対応後は連絡済・商談設定・成約／見送りへ更新します。
            </p>
          </div>
        </Card>
      </div>

      {/* ---- 申込一覧 ---- */}
      <div className="mt-4">
        <Card>
          <CardHeader
            title="紹介申込の一覧"
            subtitle="ご希望の連絡方法・日時にあわせて対応します。並べ替え・絞り込み・CSV出力"
            icon={<Users className="h-[18px] w-[18px]" />}
          />
          <div className="mt-1 pb-2">
            <SortableTable
              columns={leadCols}
              rows={leadRows}
              defaultSort="date"
              initialDir="desc"
              searchable
              exportName="紹介申込一覧"
            />
          </div>
        </Card>
      </div>

      {/* ---- 紹介者ランキング ---- */}
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader
            title="紹介者ランキング"
            subtitle="紹介数・成約・お支払い報酬"
            icon={<HandCoins className="h-[18px] w-[18px]" />}
          />
          <div className="mt-1 pb-2">
            <SortableTable columns={referrerCols} rows={referrerRows} defaultSort="reward" exportName="紹介者別実績" />
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader title="運用メモ・連携" subtitle="この画面のデータの流れ" />
          <div className="space-y-2.5 px-5 pb-5 pt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <p>
              お客様が <span className="font-mono text-xs">{data.program.formPath}</span> のフォームを送信すると、
              <span className="font-mono text-xs"> /api/referral-leads</span> が受け取り、この一覧に「未対応」として追加されます。
            </p>
            <p>
              本番運用では <span className="font-mono text-xs">src/lib/data/leads.ts</span> の
              <span className="font-mono text-xs"> addLead()</span> を、Salon One / CRM へのリード登録・担当者への
              メール / LINE 通知・DB 保存に差し替えてください（プロトタイプはサーバのメモリ上に保持します）。
            </p>
            <p className="text-xs text-slate-400">
              金額の試算に使う初期費用・月額の初期値は <span className="font-mono">src/lib/referral.ts</span> の
              FEE_ASSUMPTION（仮置き）です。実際の料金表に合わせて更新してください。
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}
