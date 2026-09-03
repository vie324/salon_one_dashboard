import { NextResponse } from "next/server";
import { addLead } from "@/lib/data/leads";
import {
  EMPTY_FORM,
  FEE_ASSUMPTION,
  REFERRAL_PROGRAM,
  freePeriod,
  hasErrors,
  validateReferralForm,
  type ReferralFormValues,
} from "@/lib/referral";
import {
  CATEGORY_LABEL,
  type ContactMethod,
  type ContactSlot,
  type SalonCategory,
  type StartPlan,
} from "@/lib/types";

export const dynamic = "force-dynamic";

// 紹介フォーム（/referral/apply）の受け口。
// 保存先の差し替えは src/lib/data/leads.ts の addLead() を参照してください。

const MAX_TEXT = 200;
const MAX_NOTE = 2000;

function str(v: unknown, max = MAX_TEXT): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** 受信した JSON を、検証済みの型に安全に寄せます。 */
function coerce(body: Record<string, unknown>): ReferralFormValues {
  const categories = Array.isArray(body.categories)
    ? (body.categories.filter(
        (c): c is SalonCategory => typeof c === "string" && c in CATEGORY_LABEL,
      ))
    : [];
  return {
    ...EMPTY_FORM,
    referrerName: str(body.referrerName),
    referrerSalon: str(body.referrerSalon),
    referrerCode: str(body.referrerCode, 40),
    companyName: str(body.companyName),
    contactName: str(body.contactName),
    phone: str(body.phone, 40),
    email: str(body.email),
    lineId: str(body.lineId, 60),
    storeCount: str(body.storeCount, 4) || "1",
    categories,
    contactMethod: str(body.contactMethod, 12) as ContactMethod | "",
    preferredDate1: str(body.preferredDate1, 10),
    preferredSlot1: str(body.preferredSlot1, 12) as ContactSlot | "",
    preferredDate2: str(body.preferredDate2, 10),
    preferredSlot2: str(body.preferredSlot2, 12) as ContactSlot | "",
    startPlan: str(body.startPlan, 12) as StartPlan | "",
    startDate: str(body.startDate, 10),
    note: str(body.note, MAX_NOTE),
    consent: body.consent === true,
  };
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const values = coerce(body ?? {});
  const errors = validateReferralForm(values);
  if (hasErrors(errors)) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const lead = addLead({
    referrerName: values.referrerName,
    referrerSalon: values.referrerSalon,
    referrerCode: values.referrerCode || undefined,
    companyName: values.companyName,
    contactName: values.contactName,
    phone: values.phone || undefined,
    email: values.email || undefined,
    lineId: values.lineId || undefined,
    storeCount: Number(values.storeCount),
    categories: values.categories,
    contactMethod: values.contactMethod as ContactMethod,
    preferredDate1: values.preferredDate1,
    preferredSlot1: values.preferredSlot1 as ContactSlot,
    preferredDate2: values.preferredDate2 || undefined,
    preferredSlot2: (values.preferredSlot2 || undefined) as ContactSlot | undefined,
    startPlan: values.startPlan as StartPlan,
    note: values.note || undefined,
    startDate: values.startDate || undefined,
  });

  // 紹介された側の特典（初月の端数日数＋2ヶ月無料）の目安を返します。
  const benefit = values.startDate
    ? {
        ...freePeriod(values.startDate),
        monthlyFeeAssumption: FEE_ASSUMPTION.byStoreCount(lead.storeCount).monthlyFee,
      }
    : null;

  return NextResponse.json(
    {
      ok: true,
      lead: { id: lead.id, submittedAt: lead.submittedAt },
      program: {
        rewardRate: REFERRAL_PROGRAM.rewardRate,
        freeMonths: REFERRAL_PROGRAM.freeMonths,
      },
      benefit,
    },
    { status: 201 },
  );
}
