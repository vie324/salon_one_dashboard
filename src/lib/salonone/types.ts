// ============================================================
// Salon One API — response types (as observed on the live API)
// ------------------------------------------------------------
// Base: https://salonone.net/api (Laravel 12 / Sanctum bearer tokens)
// Docs: https://salonone.net/docs (Scribe; masters only — see
// docs/salonone-api-requirements.md for the gap analysis)
// ============================================================

/** Standard envelope: every endpoint wraps its payload like this. */
export interface SalonOneEnvelope<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string[]>;
}

export interface SalonOneToken {
  token: string;
  /** ISO 8601 with offset, e.g. "2026-07-04T00:49:19+00:00" */
  expires_at: string;
}

export interface SalonOneUser {
  id: number;
  name: string;
  email: string;
  user_name: string;
  brand_id: number | null;
  shop_id: number | null;
  shop_name: string | null;
  brand_name: string | null;
  shop_timezone: string;
  /** "root" = all brands / all shops. */
  account_permission_type: string;
  staff_id: number | null;
  locale: string;
}

export interface SalonOneLoginData {
  access_token: SalonOneToken;
  refresh_token: SalonOneToken;
  remember: boolean;
  user: SalonOneUser;
}

export interface SalonOneBrand {
  id: number;
  user_id: number;
  name: string;
  code: string;
  logo_url: string | null;
  is_public: boolean;
  trade_name: string | null;
  company_name: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SalonOneShop {
  id: number;
  uuid: string;
  brand_id: number;
  name: string;
  name_en: string | null;
  /** Number of treatment stations / chairs. */
  scale: number;
  zip_code: string | null;
  address: string | null;
  phone_number: string | null;
  email1: string | null;
  is_public: boolean;
  sort_number: number;
  timezone: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SalonOneStaff {
  id: number;
  user_id: number | null;
  brand_id: number;
  shop_id: number;
  name: string;
  capacity: number;
  allocate_order: number;
  is_public: boolean;
  employment_type: string | null;
  hired_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

// ---- /api/appointments/calendar (phase 2 — the transactions entry point) --

export interface SalonOneCalendarAppointment {
  id: number;
  staff_id: number;
  start_at: string;
  end_at: string;
  status: number;
  total_price: number;
  hpb_point_amount: number;
  is_nominated: boolean;
  customer_id: number | null;
  customer_name: string | null;
  customer_number: number | null;
  menu_name: string | null;
  member_label: string | null; // 新規 / 既存 …
  visit_source_id: number | null;
  visit_source_name: string | null;
  payment_summary_label: string | null;
  accounting_confirmed_at: string | null;
  subscription_billing_only: boolean;
}

export interface SalonOneDailyPaymentSummary {
  payment_method_id: number;
  name: string; // 現金 / スクエア / PayPay / HPBポイント …
  amount: number;
}

export interface SalonOneCalendarData {
  staffs: { id: number; name: string; capacity: number }[];
  appointments: SalonOneCalendarAppointment[];
  range_from: string;
  range_to: string;
  daily_payment_summary: SalonOneDailyPaymentSummary[];
  subscription_billings: unknown[];
  calendar_hours: { start_hour: number; end_hour: number };
}
