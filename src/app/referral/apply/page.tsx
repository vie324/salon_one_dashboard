import { CalendarClock, Gift, HandCoins, Headset, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { ReferralForm } from "@/components/referral/ReferralForm";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { REFERRAL_PROGRAM } from "@/lib/referral";
import { formatPercent } from "@/lib/format";

// 公開の申込フォーム。ダッシュボードのシェル（サイドバー等）を持たない
// スタンドアロンのページなので、そのままお客様に共有できます。
export const metadata: Metadata = {
  title: { absolute: "紹介制度 お申し込みフォーム | Salon One" },
  description:
    "Salon One の紹介制度お申し込みフォーム。ご紹介者さまには初期費用の25%、ご紹介された方には初月の端数日数＋2ヶ月無料の特典をご用意しています。",
};

const STEPS = [
  { icon: Gift, title: "フォームを送信", desc: "ご紹介者と、ご希望の連絡方法・日時をご入力ください。" },
  { icon: Headset, title: "担当者からご連絡", desc: "ご希望の方法・日時にあわせてご連絡します（通常1〜2営業日）。" },
  { icon: CalendarClock, title: "ご利用開始", desc: "開始日から端数日数＋2ヶ月は無料でお使いいただけます。" },
];

export default function ReferralApplyPage() {
  const { rewardRate, freeMonths } = REFERRAL_PROGRAM;

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Logo />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
        {/* ---- 制度の説明 ---- */}
        <section className="card bg-grid overflow-hidden p-6 sm:p-8">
          <span className="badge badge-brand">紹介制度</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 sm:text-[28px]">
            ご紹介ありがとうございます
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            サロン管理システム「Salon One」の紹介制度のお申し込みフォームです。
            ご紹介者さまと、ご紹介いただいたお客様の双方に特典をご用意しています。
            下記フォームにご記入いただくと、ご希望の方法・日時にあわせて担当者よりご連絡します。
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gold-200 bg-gold-50/60 p-5 dark:border-gold-500/25 dark:bg-gold-500/10">
              <div className="flex items-center gap-2 text-gold-700 dark:text-gold-300">
                <HandCoins className="h-[18px] w-[18px]" />
                <span className="text-sm font-semibold">紹介した方への特典</span>
              </div>
              <p className="mt-2 text-[22px] font-bold leading-tight text-slate-900 dark:text-slate-50">
                初期費用の <span className="tnum text-gold-600 dark:text-gold-400">{formatPercent(rewardRate, 0)}</span> をお支払い
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                ご紹介先のご契約（初期費用のご入金確認）後、{REFERRAL_PROGRAM.rewardTiming}にお支払いします。
              </p>
            </div>

            <div className="rounded-xl border border-brand-200 bg-brand-50/70 p-5 dark:border-brand-500/25 dark:bg-brand-500/10">
              <div className="flex items-center gap-2 text-brand-700 dark:text-brand-300">
                <Gift className="h-[18px] w-[18px]" />
                <span className="text-sm font-semibold">紹介された方への特典</span>
              </div>
              <p className="mt-2 text-[22px] font-bold leading-tight text-slate-900 dark:text-slate-50">
                初月の端数日数 ＋ <span className="tnum text-brand-600 dark:text-brand-400">{freeMonths}ヶ月</span> 無料
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                ご利用開始日からその月末までの日割り分に加えて、翌月・翌々月の月額が無料になります。
              </p>
            </div>
          </div>

          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="panel flex items-start gap-3 p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-brand-600 shadow-soft dark:bg-slate-900 dark:text-brand-400">
                  <s.icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    <span className="tnum mr-1.5 text-xs text-slate-400">0{i + 1}</span>
                    {s.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{s.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- フォーム ---- */}
        <div className="mt-6">
          <ReferralForm />
        </div>

        {/* ---- 注意事項 ---- */}
        <section className="mt-6 card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            <ShieldCheck className="h-[18px] w-[18px] text-slate-400" />
            特典の適用について
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            <li>・特典は、ご紹介者のお名前をご記入のうえ本フォームからお申し込みいただいた場合に適用されます。</li>
            <li>・紹介した方への{formatPercent(rewardRate, 0)}は、ご紹介先のご契約後（初期費用のご入金確認後）にお支払いします。</li>
            <li>・紹介された方の無料期間は、ご利用開始日から当月末までの端数日数と、その後{freeMonths}ヶ月分です。</li>
            <li>・すでにお問い合わせ・商談中のお客様は特典の対象外となる場合があります。</li>
            <li>・ご入力いただいた情報は、ご連絡・ご案内および特典の適用のみに利用します。</li>
          </ul>
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          © Salon One — サロン管理システム
        </p>
      </main>
    </div>
  );
}
