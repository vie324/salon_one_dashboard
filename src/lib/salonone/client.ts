// ============================================================
// Salon One API client — SERVER ONLY.
// ------------------------------------------------------------
// Credentials come from environment variables and must never reach the
// browser bundle. Handles login → in-memory token cache → auto refresh
// (access tokens live ~1h, refresh tokens ~30d and rotate on use).
//
//   SALONONE_BASE_URL    e.g. "https://salonone.net"  (default)
//   SALONONE_BRAND_CODE  企業コード
//   SALONONE_LOGIN_ID    ログインID
//   SALONONE_PASSWORD    パスワード
// ============================================================

import type { SalonOneEnvelope, SalonOneLoginData, SalonOneUser } from "./types";

const DEFAULT_BASE_URL = "https://salonone.net";
const REQUEST_TIMEOUT_MS = 20_000;
/** Refresh the access token this long before its stated expiry. */
const EXPIRY_MARGIN_MS = 60_000;

export interface SalonOneConfig {
  baseUrl: string;
  brandCode: string;
  loginId: string;
  password: string;
}

export function getConfig(): SalonOneConfig | null {
  if (typeof window !== "undefined") {
    throw new Error("salonone client must never run in the browser");
  }
  const brandCode = process.env.SALONONE_BRAND_CODE;
  const loginId = process.env.SALONONE_LOGIN_ID;
  const password = process.env.SALONONE_PASSWORD;
  if (!brandCode || !loginId || !password) return null;
  return {
    baseUrl: (process.env.SALONONE_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    brandCode,
    loginId,
    password,
  };
}

/** True when the SALONONE_* credentials are present in the environment. */
export function isConfigured(): boolean {
  return getConfig() !== null;
}

// ---- token state (module-level; survives across requests in one process) --

interface TokenState {
  accessToken: string;
  accessExpiresAt: number; // epoch ms
  refreshToken: string;
  refreshExpiresAt: number; // epoch ms
  user: SalonOneUser;
}

let tokenState: TokenState | null = null;
let inflightAuth: Promise<TokenState> | null = null;

function toEpoch(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Date.now() + 30 * 60_000 : t;
}

async function rawFetch<T>(
  config: SalonOneConfig,
  path: string,
  init?: RequestInit,
): Promise<SalonOneEnvelope<T>> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as SalonOneEnvelope<T> | null;
  if (!body) {
    throw new SalonOneApiError(`Salon One API: invalid JSON (HTTP ${res.status}) at ${path}`, res.status);
  }
  if (!res.ok || body.success === false) {
    throw new SalonOneApiError(
      `Salon One API: ${body.message ?? `HTTP ${res.status}`} at ${path}`,
      res.status,
    );
  }
  return body;
}

export class SalonOneApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SalonOneApiError";
    this.status = status;
  }
}

function stateFromLogin(data: SalonOneLoginData): TokenState {
  return {
    accessToken: data.access_token.token,
    accessExpiresAt: toEpoch(data.access_token.expires_at),
    refreshToken: data.refresh_token.token,
    refreshExpiresAt: toEpoch(data.refresh_token.expires_at),
    user: data.user,
  };
}

async function login(config: SalonOneConfig): Promise<TokenState> {
  const body = await rawFetch<SalonOneLoginData>(config, "/api/login", {
    method: "POST",
    body: JSON.stringify({
      brand_code: config.brandCode,
      login_id: config.loginId,
      password: config.password,
      remember: true,
    }),
  });
  return stateFromLogin(body.data);
}

async function refresh(config: SalonOneConfig, state: TokenState): Promise<TokenState> {
  // NOTE: refresh rotates BOTH tokens and revokes the previous pair.
  const body = await rawFetch<SalonOneLoginData>(config, "/api/refresh-token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: state.refreshToken }),
  });
  return { ...stateFromLogin(body.data), user: body.data.user ?? state.user };
}

/** Get a valid access token, logging in / refreshing as needed (single-flight). */
async function ensureAuth(config: SalonOneConfig): Promise<TokenState> {
  const now = Date.now();
  if (tokenState && tokenState.accessExpiresAt - EXPIRY_MARGIN_MS > now) {
    return tokenState;
  }
  if (!inflightAuth) {
    const current = tokenState;
    inflightAuth = (async () => {
      if (current && current.refreshExpiresAt - EXPIRY_MARGIN_MS > Date.now()) {
        try {
          return await refresh(config, current);
        } catch {
          // rotated/revoked elsewhere → fall through to a fresh login
        }
      }
      return login(config);
    })();
    inflightAuth
      .then((s) => {
        tokenState = s;
      })
      .catch(() => {
        tokenState = null;
      })
      .finally(() => {
        inflightAuth = null;
      });
  }
  return inflightAuth;
}

/** Drop the cached tokens (e.g. after a 401). */
export function invalidateAuth(): void {
  tokenState = null;
}

// ---- public API ------------------------------------------------------------

/**
 * Authenticated GET. Returns the unwrapped `data` payload.
 * Retries once after re-authenticating if the API answers 401.
 */
export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  const config = getConfig();
  if (!config) throw new Error("Salon One API is not configured (missing SALONONE_* env vars)");

  const qs = params
    ? "?" +
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join("&")
    : "";

  for (let attempt = 0; ; attempt++) {
    const auth = await ensureAuth(config);
    try {
      const body = await rawFetch<T>(config, `${path}${qs}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      return body.data;
    } catch (e) {
      if (e instanceof SalonOneApiError && e.status === 401 && attempt === 0) {
        invalidateAuth();
        continue; // one re-auth retry
      }
      throw e;
    }
  }
}

/** Lightweight connectivity check for the settings screen. */
export async function ping(): Promise<
  { ok: true; user: SalonOneUser } | { ok: false; error: string }
> {
  const config = getConfig();
  if (!config) return { ok: false, error: "環境変数（SALONONE_*）が未設定です" };
  try {
    const user = await apiGet<SalonOneUser>("/api/me");
    return { ok: true, user };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
