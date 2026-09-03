"use client";

// 紹介制度のお申し込みフォーム（お客様が入力する画面）。
// 入力チェックは src/lib/referral.ts の validateReferralForm を
// サーバ（/api/referral-leads）と共有しています。

import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Gift,
  Loader2,
  MessageSquare,
  Send,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatDateFull } from "@/lib/format";
import {
  CONTACT_METHOD_OPTIONS,
  CONTACT_SLOT_OPTIONS,
  EMPTY_FORM,
  START_PLAN_OPTIONS,
  freePeriod,
  hasErrors,
  validateReferralForm,
  type FormErrors,
  type ReferralFormValues,
} from "@/lib/referral";
import {
  CATEGORY_LABEL,
  CONTACT_METHOD_LABEL,
  CONTACT_SLOT_LABEL,
  type ContactMethod,
  type ContactSlot,
  type SalonCategory,
  type StartPlan,
} from "@/lib/types";

interface SubmitResult {
  lead: { id: string; submittedAt: string };
}

export function ReferralForm() {
  const [v, setV] = useState<ReferralFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState("");
  const [done, setDone] = useState<SubmitResult | null>(null);

  // 日付入力の下限は「今日」。クライアント側で設定し、SSR との差異を避けます。
  const [today, setToday] = useState("");
  useEffect(() => {
    const d = new Date();
    setToday(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }, []);

  function set<K extends keyof ReferralFormValues>(key: K, value: ReferralFormValues[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }

  function toggleCategory(c: SalonCategory) {
    setV((prev) => ({
      ...prev,
      categories: prev.categories.includes(c)
        ? prev.categories.filter((x) => x !== c)
        : [...prev.categories, c],
    }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFailed("");
    const errs = validateReferralForm(v);
    setErrors(errs);
    if (hasErrors(errs)) {
      document.querySelector("[data-error='true']")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/referral-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors(json.errors ?? {});
        setFailed("入力内容をご確認のうえ、もう一度お試しください。");
        return;
      }
      setDone(json as SubmitResult);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFailed("通信エラーが発生しました。時間をおいて再度お試しください。");
    } finally {
      setSending(false);
    }
  }

  if (done) return <Submitted result={done} values={v} onReset={() => { setDone(null); setV(EMPTY_FORM); }} />;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* ---- 1. 誰に紹介されたか ---- */}
      <Section
        step={1}
        icon={<UserRound className="h-[18px] w-[18px]" />}
        title="どなたのご紹介ですか？"
        subtitle="ご紹介者さまに特典（初期費用の25%）をお渡しするため、お名前をご入力ください。"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ご紹介者のお名前" required error={errors.referrerName}>
            <input
              className="input w-full"
              placeholder="例）田村 佳奈"
              value={v.referrerName}
              onChange={(e) => set("referrerName", e.target.value)}
            />
          </Field>
          <Field label="ご紹介者のサロン・会社名" hint="わかる範囲で結構です" error={errors.referrerSalon}>
            <input
              className="input w-full"
              placeholder="例）hair atelier NOA"
              value={v.referrerSalon}
              onChange={(e) => set("referrerSalon", e.target.value)}
            />
          </Field>
          <Field label="紹介コード" hint="お持ちの方のみ" error={errors.referrerCode}>
            <input
              className="input w-full"
              placeholder="例）REF-NOA31"
              value={v.referrerCode}
              onChange={(e) => set("referrerCode", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {/* ---- 2. お客様について ---- */}
      <Section
        step={2}
        icon={<MessageSquare className="h-[18px] w-[18px]" />}
        title="お客様について"
        subtitle="ご連絡先とサロンの情報をご入力ください。"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="サロン・会社名" required error={errors.companyName}>
            <input
              className="input w-full"
              placeholder="例）株式会社ベルフィオーレ"
              value={v.companyName}
              onChange={(e) => set("companyName", e.target.value)}
            />
          </Field>
          <Field label="ご担当者さまのお名前" required error={errors.contactName}>
            <input
              className="input w-full"
              placeholder="例）小田切 恵"
              value={v.contactName}
              onChange={(e) => set("contactName", e.target.value)}
            />
          </Field>
          <Field label="電話番号" hint="電話・SMS をご希望の場合は必須" error={errors.phone}>
            <input
              className="input w-full"
              type="tel"
              inputMode="tel"
              placeholder="例）090-1234-5678"
              value={v.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="メールアドレス" hint="メール・オンライン面談をご希望の場合は必須" error={errors.email}>
            <input
              className="input w-full"
              type="email"
              inputMode="email"
              placeholder="例）info@example.jp"
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          {v.contactMethod === "line" && (
            <Field label="LINE ID" required error={errors.lineId}>
              <input
                className="input w-full"
                placeholder="例）@salon123"
                value={v.lineId}
                onChange={(e) => set("lineId", e.target.value)}
              />
            </Field>
          )}
          <Field label="店舗数" error={errors.storeCount}>
            <input
              className="input w-full"
              type="number"
              min={1}
              max={999}
              value={v.storeCount}
              onChange={(e) => set("storeCount", e.target.value)}
            />
          </Field>
        </div>

        <Field label="業種" hint="複数選択できます" className="mt-4" group>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORY_LABEL) as SalonCategory[]).map((c) => {
              const on = v.categories.includes(c);
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => toggleCategory(c)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition",
                    on
                      ? "border-brand-500 bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                >
                  {CATEGORY_LABEL[c]}
                </button>
              );
            })}
          </div>
        </Field>
      </Section>

      {/* ---- 3. ご連絡について ---- */}
      <Section
        step={3}
        icon={<CalendarClock className="h-[18px] w-[18px]" />}
        title="ご連絡について"
        subtitle="ご希望の連絡方法と日時にあわせて、担当者からご連絡します。"
      >
        <Field label="連絡してほしい方法" required error={errors.contactMethod} group>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {CONTACT_METHOD_OPTIONS.map((m) => {
              const on = v.contactMethod === m.key;
              return (
                <label
                  key={m.key}
                  className={cn(
                    "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition",
                    on
                      ? "border-brand-500 bg-brand-50/70 dark:bg-brand-500/10"
                      : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60",
                  )}
                >
                  <input
                    type="radio"
                    name="contactMethod"
                    className="mt-1 h-4 w-4 accent-brand-600"
                    checked={on}
                    onChange={() => set("contactMethod", m.key as ContactMethod)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{m.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{m.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </Field>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="ご連絡希望日（第1希望）" required error={errors.preferredDate1}>
            <input
              className="input w-full"
              type="date"
              min={today}
              value={v.preferredDate1}
              onChange={(e) => set("preferredDate1", e.target.value)}
            />
          </Field>
          <Field label="時間帯（第1希望）" required error={errors.preferredSlot1}>
            <select
              className="select w-full"
              value={v.preferredSlot1}
              onChange={(e) => set("preferredSlot1", e.target.value as ContactSlot)}
            >
              <option value="">選択してください</option>
              {CONTACT_SLOT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field label="ご連絡希望日（第2希望）" hint="任意" error={errors.preferredDate2}>
            <input
              className="input w-full"
              type="date"
              min={v.preferredDate1 || today}
              value={v.preferredDate2}
              onChange={(e) => set("preferredDate2", e.target.value)}
            />
          </Field>
          <Field label="時間帯（第2希望）" hint="任意" error={errors.preferredSlot2}>
            <select
              className="select w-full"
              value={v.preferredSlot2}
              onChange={(e) => set("preferredSlot2", e.target.value as ContactSlot)}
            >
              <option value="">選択してください</option>
              {CONTACT_SLOT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="ご利用開始のご希望時期" required error={errors.startPlan}>
            <select
              className="select w-full"
              value={v.startPlan}
              onChange={(e) => set("startPlan", e.target.value as StartPlan)}
            >
              <option value="">選択してください</option>
              {START_PLAN_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </Field>
          <Field
            label="ご利用開始のご希望日"
            hint="任意。無料期間の目安を計算します"
            error={errors.startDate}
          >
            <input
              className="input w-full"
              type="date"
              min={today}
              value={v.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </Field>
        </div>

        {v.startDate && <FreePeriodPreview startDate={v.startDate} className="mt-4" />}

        <Field label="ご相談内容・ご要望" hint="任意" className="mt-4" error={errors.note}>
          <textarea
            className="input h-28 w-full resize-y py-2 leading-relaxed"
            placeholder="例）他社システムからの乗り換えを検討しています。データ移行が可能か知りたいです。"
            value={v.note}
            onChange={(e) => set("note", e.target.value)}
            maxLength={2000}
          />
        </Field>
      </Section>

      {/* ---- 同意・送信 ---- */}
      <div className="card p-5">
        <label className="flex items-start gap-2.5" data-error={errors.consent ? "true" : undefined}>
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-brand-600"
            checked={v.consent}
            onChange={(e) => set("consent", e.target.checked)}
          />
          <span className="text-sm text-slate-600 dark:text-slate-300">
            ご入力いただいた情報を、ご連絡・ご案内および紹介特典の適用のために利用することに同意します。
            <span className="ml-1 text-rose-500">*</span>
          </span>
        </label>
        {errors.consent && <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{errors.consent}</p>}

        {failed && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
            {failed}
          </p>
        )}

        <div className="mt-4 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            送信後、ご希望の方法・日時にあわせて担当者よりご連絡します（通常1〜2営業日以内）。
          </p>
          <button type="submit" disabled={sending} className="btn btn-primary h-11 w-full px-6 text-[15px] sm:w-auto">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {sending ? "送信中…" : "この内容で申し込む"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ---- 送信完了 --------------------------------------------------------------

function Submitted({
  result,
  values,
  onReset,
}: {
  result: SubmitResult;
  values: ReferralFormValues;
  onReset: () => void;
}) {
  return (
    <div className="card animate-scale-in p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">お申し込みを受け付けました</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            受付番号 <span className="tnum font-semibold text-slate-700 dark:text-slate-200">{result.lead.id}</span>
          </p>
        </div>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        <Summary label="ご紹介者" value={values.referrerName + (values.referrerSalon ? `（${values.referrerSalon}）` : "")} />
        <Summary label="ご連絡方法" value={values.contactMethod ? CONTACT_METHOD_LABEL[values.contactMethod] : "—"} />
        <Summary
          label="第1希望"
          value={
            values.preferredDate1
              ? `${formatDateFull(values.preferredDate1)}　${values.preferredSlot1 ? CONTACT_SLOT_LABEL[values.preferredSlot1] : ""}`
              : "—"
          }
        />
        <Summary
          label="第2希望"
          value={
            values.preferredDate2
              ? `${formatDateFull(values.preferredDate2)}　${values.preferredSlot2 ? CONTACT_SLOT_LABEL[values.preferredSlot2] : ""}`
              : "—"
          }
        />
      </dl>

      {values.startDate && <FreePeriodPreview startDate={values.startDate} className="mt-5" />}

      <p className="mt-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
        ご希望の方法・日時にあわせて担当者よりご連絡します。ご紹介者さまには、ご契約（初期費用のご入金確認）後に
        <span className="font-semibold text-slate-700 dark:text-slate-200">初期費用の25%</span>
        をお支払いします。
      </p>

      <button onClick={onReset} className="btn btn-outline btn-md mt-5">
        続けて別のお申し込みを入力
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel px-4 py-3">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}

// ---- 無料期間のプレビュー ---------------------------------------------------

export function FreePeriodPreview({ startDate, className }: { startDate: string; className?: string }) {
  const p = useMemo(() => freePeriod(startDate), [startDate]);
  return (
    <div className={cn("rounded-xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10", className)}>
      <div className="flex items-center gap-2 text-brand-800 dark:text-brand-200">
        <Gift className="h-4 w-4" />
        <span className="text-sm font-semibold">
          {formatDateFull(p.start)} 開始なら、{formatDateFull(p.freeUntil)} まで無料
        </span>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
        <li>
          ・初月の端数 <span className="tnum font-semibold">{p.remainderDays}</span> 日
          （{formatDateFull(p.start)} 〜 月末）＋ <span className="tnum font-semibold">{p.freeMonths}</span> ヶ月無料
          ＝ 合計 <span className="tnum font-semibold">{p.totalFreeDays}</span> 日
        </li>
        <li>・初回のご請求は {formatDateFull(p.billingStart)} 開始分からです</li>
      </ul>
    </div>
  );
}

// ---- 小さな UI 部品 ---------------------------------------------------------

function Section({
  step,
  icon,
  title,
  subtitle,
  children,
}: {
  step: number;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="card p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            <span className="tnum text-xs font-bold text-brand-600 dark:text-brand-400">STEP {step}</span>
            {title}
          </h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  error,
  className,
  /** ラジオ／チェックボックス群では label の入れ子を避けるため div で描画します。 */
  group,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  className?: string;
  group?: boolean;
  children: ReactNode;
}) {
  const Tag = group ? "div" : "label";
  return (
    <Tag className={cn("block", className)} data-error={error ? "true" : undefined}>
      <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</span>
        {required ? (
          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            必須
          </span>
        ) : (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            任意
          </span>
        )}
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </Tag>
  );
}
