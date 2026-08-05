import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, type Filters } from "@/lib/filters";
import {
  filteredStores,
  getBudget,
  getCancellations,
  getCashflow,
  getCatalog,
  getCourses,
  getCustomers,
  getFinancials,
  getFranchise,
  getFunding,
  getInsurance,
  getInventory,
  getLabor,
  getMarketing,
  getMembership,
  getOverview,
  getReconciliation,
  getRelax,
  getSales,
  getStoreDetail,
  getStores,
  getStylists,
} from "./index";

// Every screen reads through one of these selectors. This is the contract the
// future Salon One integration must keep: each returns a defined shape and is
// pure (same filters in → identical data out, so SSR and CSR never disagree).
const SELECTORS: Record<string, (f: Filters) => unknown> = {
  getOverview,
  getSales,
  getCashflow,
  getReconciliation,
  getFinancials,
  getStores,
  getCustomers,
  getMarketing,
  getBudget,
  getInventory,
  getCancellations,
  getLabor,
  getFunding,
  getFranchise,
  getCourses,
  getInsurance,
  getStylists,
  getMembership,
  getRelax,
};

describe("getCatalog", () => {
  it("exposes brands and stores, with each store carrying its brand name", () => {
    const c = getCatalog();
    expect(c.brands.length).toBeGreaterThan(0);
    expect(c.stores.length).toBeGreaterThan(0);
    for (const s of c.stores) {
      expect(typeof s.brandName).toBe("string");
      expect(s.brandName.length).toBeGreaterThan(0);
    }
  });
});

describe("filteredStores", () => {
  it("returns every store for the all/all filter", () => {
    expect(filteredStores(DEFAULT_FILTERS).length).toBe(getCatalog().stores.length);
  });
  it("narrows to a single brand", () => {
    const brandId = getCatalog().brands[0].id;
    const rows = filteredStores({ ...DEFAULT_FILTERS, brandId });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((s) => s.brandId === brandId)).toBe(true);
  });
});

describe("selectors", () => {
  for (const [name, fn] of Object.entries(SELECTORS)) {
    it(`${name} returns a defined shape`, () => {
      const out = fn(DEFAULT_FILTERS);
      expect(out).toBeTruthy();
    });
    it(`${name} is deterministic for identical filters`, () => {
      expect(JSON.stringify(fn(DEFAULT_FILTERS))).toBe(JSON.stringify(fn(DEFAULT_FILTERS)));
    });
  }
});

describe("getOverview", () => {
  it("produces a KPI set with the expected primitive shape", () => {
    const o = getOverview(DEFAULT_FILTERS);
    expect(Array.isArray(o.kpis)).toBe(true);
    expect(o.kpis.length).toBeGreaterThan(0);
    for (const k of o.kpis) {
      expect(typeof k.key).toBe("string");
      expect(typeof k.label).toBe("string");
      expect(Number.isFinite(k.value)).toBe(true);
    }
  });
});

describe("getStoreDetail", () => {
  it("resolves a real store id and is deterministic", () => {
    const id = getCatalog().stores[0].id;
    const a = getStoreDetail(id, DEFAULT_FILTERS);
    expect(a).toBeTruthy();
    expect(JSON.stringify(a)).toBe(JSON.stringify(getStoreDetail(id, DEFAULT_FILTERS)));
  });
  it("returns a falsy value for an unknown store id", () => {
    expect(getStoreDetail("does-not-exist", DEFAULT_FILTERS)).toBeFalsy();
  });
});
