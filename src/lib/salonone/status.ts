// Connection status for the settings screen — SERVER ONLY.

import { getDataset } from "@/lib/data/source";
import { getConfig, ping } from "./client";

export interface SalonOneStatus {
  /** SALONONE_* env vars are present. */
  configured: boolean;
  /** Login + /api/me round-trip succeeded. */
  connected: boolean;
  baseUrl: string | null;
  user: { name: string; permission: string } | null;
  /** Master counts actually loaded into the dashboard. */
  counts: { brands: number; stores: number; staff: number } | null;
  /** What the current dataset is built from. */
  source: "mock" | "salonone";
  fetchedAt: string | null;
  error: string | null;
}

export async function getSalonOneStatus(): Promise<SalonOneStatus> {
  const config = getConfig();
  if (!config) {
    return {
      configured: false,
      connected: false,
      baseUrl: null,
      user: null,
      counts: null,
      source: "mock",
      fetchedAt: null,
      error: null,
    };
  }

  const [pingResult, dataset] = await Promise.all([ping(), getDataset()]);
  return {
    configured: true,
    connected: pingResult.ok,
    baseUrl: config.baseUrl,
    user: pingResult.ok
      ? { name: pingResult.user.name, permission: pingResult.user.account_permission_type }
      : null,
    counts:
      dataset.source === "salonone"
        ? {
            brands: dataset.brands.length,
            stores: dataset.stores.length,
            staff: dataset.stores.reduce((s, st) => s + st.staff, 0),
          }
        : null,
    source: dataset.source,
    fetchedAt: dataset.fetchedAt,
    error: pingResult.ok ? dataset.syncError ?? null : pingResult.error,
  };
}
