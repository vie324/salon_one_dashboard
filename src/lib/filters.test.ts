import { describe, expect, it } from "vitest";
import {
  CURRENT_YM,
  DEFAULT_FILTERS,
  buildQuery,
  comparisonMonths,
  isSingleMonth,
  parseFilters,
  periodMonths,
  shiftYm,
  ymRange,
  type Filters,
} from "./filters";

const withPeriod = (f: Partial<Filters>): Filters => ({ ...DEFAULT_FILTERS, ...f });

describe("shiftYm", () => {
  it("moves forward and back within a year", () => {
    expect(shiftYm("2026-06", 1)).toBe("2026-07");
    expect(shiftYm("2026-06", -1)).toBe("2026-05");
  });
  it("rolls across year boundaries", () => {
    expect(shiftYm("2026-01", -1)).toBe("2025-12");
    expect(shiftYm("2025-11", 3)).toBe("2026-02");
  });
});

describe("ymRange", () => {
  it("is inclusive on both ends", () => {
    expect(ymRange("2026-04", "2026-06")).toEqual(["2026-04", "2026-05", "2026-06"]);
  });
  it("returns a single month when start === end", () => {
    expect(ymRange("2026-06", "2026-06")).toEqual(["2026-06"]);
  });
});

describe("periodMonths", () => {
  it("resolves the preset windows anchored at CURRENT_YM", () => {
    expect(periodMonths(withPeriod({ period: "thisMonth" }))).toEqual([CURRENT_YM]);
    expect(periodMonths(withPeriod({ period: "lastMonth" }))).toEqual(["2026-05"]);
    expect(periodMonths(withPeriod({ period: "last3m" }))).toHaveLength(3);
    expect(periodMonths(withPeriod({ period: "last6m" }))).toHaveLength(6);
    expect(periodMonths(withPeriod({ period: "last12m" }))).toHaveLength(12);
  });
  it("starts the fiscal year in April", () => {
    // CURRENT_YM is 2026-06, so this FY is 2026-04 .. 2026-06.
    expect(periodMonths(withPeriod({ period: "thisFY" }))).toEqual(["2026-04", "2026-05", "2026-06"]);
  });

  describe("custom range", () => {
    it("uses an explicit from/to", () => {
      expect(periodMonths(withPeriod({ period: "custom", from: "2026-01", to: "2026-03" }))).toEqual([
        "2026-01",
        "2026-02",
        "2026-03",
      ]);
    });
    it("swaps an inverted range", () => {
      expect(periodMonths(withPeriod({ period: "custom", from: "2026-06", to: "2026-04" }))).toEqual([
        "2026-04",
        "2026-05",
        "2026-06",
      ]);
    });
    it("clamps below the data floor and above the current month", () => {
      const months = periodMonths(withPeriod({ period: "custom", from: "2020-01", to: "2030-01" }));
      expect(months[0]).toBe("2024-06");
      expect(months[months.length - 1]).toBe(CURRENT_YM);
    });
  });
});

describe("comparisonMonths", () => {
  it("shifts a year back for prevYear", () => {
    expect(comparisonMonths(withPeriod({ period: "thisMonth", compare: "prevYear" }))).toEqual(["2025-06"]);
  });
  it("shifts one window back for prevPeriod", () => {
    expect(comparisonMonths(withPeriod({ period: "thisMonth", compare: "prevPeriod" }))).toEqual(["2026-05"]);
    expect(comparisonMonths(withPeriod({ period: "last3m", compare: "prevPeriod" }))).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ]);
  });
});

describe("isSingleMonth", () => {
  it("is true only for the single-month presets", () => {
    expect(isSingleMonth("thisMonth")).toBe(true);
    expect(isSingleMonth("lastMonth")).toBe(true);
    expect(isSingleMonth("last3m")).toBe(false);
    expect(isSingleMonth("custom")).toBe(false);
  });
});

describe("parseFilters", () => {
  it("falls back to defaults for an empty query", () => {
    expect(parseFilters({})).toEqual(DEFAULT_FILTERS);
  });
  it("reads valid params", () => {
    expect(parseFilters({ period: "last3m", brand: "b1", store: "s1", compare: "prevPeriod" })).toEqual({
      period: "last3m",
      brandId: "b1",
      storeId: "s1",
      compare: "prevPeriod",
      from: undefined,
      to: undefined,
    });
  });
  it("rejects invalid period / compare values", () => {
    const f = parseFilters({ period: "bogus", compare: "sideways" });
    expect(f.period).toBe("thisMonth");
    expect(f.compare).toBe("prevYear");
  });
  it("keeps from/to only for the custom period", () => {
    expect(parseFilters({ period: "custom", from: "2025-01", to: "2025-06" })).toMatchObject({
      from: "2025-01",
      to: "2025-06",
    });
    expect(parseFilters({ period: "last3m", from: "2025-01", to: "2025-06" })).toMatchObject({
      from: undefined,
      to: undefined,
    });
  });
  it("takes the first value when a param repeats", () => {
    expect(parseFilters({ brand: ["b1", "b2"] }).brandId).toBe("b1");
  });
});

describe("buildQuery", () => {
  it("omits every default", () => {
    expect(buildQuery({})).toBe("");
    expect(buildQuery({ period: "thisMonth", brandId: "all", storeId: "all", compare: "prevYear" })).toBe("");
  });
  it("serialises non-defaults", () => {
    expect(buildQuery({ period: "last3m", brandId: "b1" })).toBe("?period=last3m&brand=b1");
    expect(buildQuery({ storeId: "s1", compare: "prevPeriod" })).toBe("?store=s1&compare=prevPeriod");
  });
  it("includes a valid custom range but skips malformed months", () => {
    expect(buildQuery({ period: "custom", from: "2025-01", to: "2025-06" })).toBe(
      "?period=custom&from=2025-01&to=2025-06",
    );
    expect(buildQuery({ period: "custom", from: "nonsense" })).toBe("?period=custom");
  });
});

describe("buildQuery ↔ parseFilters round-trip", () => {
  it("preserves a fully-specified custom filter", () => {
    const original: Filters = {
      period: "custom",
      brandId: "b1",
      storeId: "all",
      compare: "prevPeriod",
      from: "2025-01",
      to: "2025-06",
    };
    const record = Object.fromEntries(new URLSearchParams(buildQuery(original).slice(1)).entries());
    expect(parseFilters(record)).toEqual(original);
  });
});
