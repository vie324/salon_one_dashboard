// ============================================================
// 紹介フォームの申込（リード）の受け口
// ------------------------------------------------------------
// プロトタイプではサーバのメモリ上に保持します（インスタンス単位。再起動や
// スケールアウトで消えます）。デモでは「フォーム送信 → 管理画面に反映」を
// そのまま確認できます。
//
// ★連携の差し込み口：addLead() の中身を差し替えるだけで本番運用に移行できます。
//   ・Salon One / CRM のリード作成 API へ POST
//   ・DB（Postgres 等）へ保存
//   ・担当者へメール / LINE / Slack 通知
//   ・紹介者へ「紹介が入りました」の通知
// ============================================================

import { makeLeadId } from "@/lib/referral";
import type { ReferralLead } from "@/lib/types";
import { REFERRAL_LEADS } from "./generate";

const store = globalThis as typeof globalThis & { __salononeReferralLeads?: ReferralLead[] };
const runtime: ReferralLead[] = (store.__salononeReferralLeads ??= []);

/** 送信フォームから受け取る項目（受付番号・受付日時・ステータスはサーバで付与）。 */
export type NewReferralLead = Omit<ReferralLead, "id" | "submittedAt" | "status">;

/** 申込を1件登録し、受付番号付きのレコードを返します。 */
export function addLead(input: NewReferralLead): ReferralLead {
  const submittedAt = new Date().toISOString();
  const lead: ReferralLead = {
    ...input,
    id: makeLeadId(submittedAt, REFERRAL_LEADS.length + runtime.length + 1),
    submittedAt,
    status: "new",
  };
  runtime.unshift(lead);
  return lead;
}

/** モックの実績 ＋ 本セッションで送信された申込（受付日時の新しい順）。 */
export function allLeads(): ReferralLead[] {
  return [...runtime, ...REFERRAL_LEADS].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

/** 本セッションで送信された申込のみ。 */
export function runtimeLeads(): ReferralLead[] {
  return runtime;
}
