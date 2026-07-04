// ============================================================
// Dataset provider — decides where the dashboard's data comes from.
// ------------------------------------------------------------
// - SALONONE_* env vars present  → sync the REAL masters (brands / stores /
//   staff) from the Salon One API and build the dataset on top of them.
//   Transactional numbers are still generated (deterministic mock) until
//   phase 2 swaps them for real aggregates — see
//   docs/salonone-api-requirements.md.
// - Not configured (or API down) → the original mock catalog. Screens are
//   unchanged from the pure-prototype behaviour.
//
// Results are cached in-process with a TTL so a burst of selectors (one page
// render calls several) only hits the Salon One API once.
// ============================================================

import type { Brand, Store } from "@/lib/types";
import { isConfigured } from "@/lib/salonone/client";
import { fetchMasterData } from "@/lib/salonone/master";
import { BRANDS, STORES } from "./catalog";
import { buildDataset, type GeneratedData } from "./generate";

export type DataSource = "mock" | "salonone";

export interface Dataset extends GeneratedData {
  /** Where the masters (brands / stores / staff) came from. */
  source: DataSource;
  /** When the Salon One masters were fetched (null for pure mock). */
  fetchedAt: string | null;
  /** Set when a Salon One sync was attempted but failed (mock fallback). */
  syncError?: string;
  brandById(id: string): Brand | undefined;
  storeById(id: string): Store | undefined;
}

function withLookups(
  data: GeneratedData,
  meta: { source: DataSource; fetchedAt: string | null; syncError?: string },
): Dataset {
  const brandMap = new Map(data.brands.map((b) => [b.id, b]));
  const storeMap = new Map(data.stores.map((s) => [s.id, s]));
  return {
    ...data,
    ...meta,
    brandById: (id) => brandMap.get(id),
    storeById: (id) => storeMap.get(id),
  };
}

// ---- mock (built once, deterministic) --------------------------------------

let mockDataset: Dataset | null = null;

export function getMockDataset(syncError?: string): Dataset {
  if (!mockDataset) {
    mockDataset = withLookups(buildDataset(BRANDS, STORES), {
      source: "mock",
      fetchedAt: null,
    });
  }
  return syncError ? { ...mockDataset, syncError } : mockDataset;
}

// ---- live (Salon One masters, TTL-cached) ----------------------------------

const TTL_MS = Number(process.env.SALONONE_MASTER_TTL_SECONDS ?? 300) * 1000;

let liveCache: { at: number; data: Dataset } | null = null;
let inflight: Promise<Dataset> | null = null;

async function buildLiveDataset(): Promise<Dataset> {
  const master = await fetchMasterData();
  return withLookups(buildDataset(master.brands, master.stores, master.staffByStore), {
    source: "salonone",
    fetchedAt: master.fetchedAt,
  });
}

/**
 * The dataset every selector works from. Never throws: if the Salon One
 * sync fails the mock dataset is returned with `syncError` set.
 */
export async function getDataset(): Promise<Dataset> {
  if (!isConfigured()) return getMockDataset();

  const now = Date.now();
  if (liveCache && now - liveCache.at < TTL_MS) return liveCache.data;

  if (!inflight) {
    inflight = buildLiveDataset()
      .then((data) => {
        liveCache = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }

  try {
    return await inflight;
  } catch (e) {
    // Stale data beats no data; mock beats a crash.
    if (liveCache) return liveCache.data;
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[salonone] master sync failed — falling back to mock:", msg);
    return getMockDataset(msg);
  }
}
