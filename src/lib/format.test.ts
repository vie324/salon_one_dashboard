import { describe, expect, it } from "vitest";
import {
  compactJa,
  formatDate,
  formatDateFull,
  formatDecimal,
  formatDelta,
  formatNumber,
  formatPercent,
  formatValue,
  formatYen,
  formatYenCompact,
  formatYm,
} from "./format";

describe("formatYen", () => {
  it("adds the yen mark and groups thousands", () => {
    expect(formatYen(1234567)).toBe("¥1,234,567");
  });
  it("rounds fractional yen", () => {
    expect(formatYen(999.6)).toBe("¥1,000");
  });
});

describe("formatYenCompact", () => {
  it("compacts to 億 with one decimal, dropping a trailing .0", () => {
    expect(formatYenCompact(150_000_000)).toBe("¥1.5億");
    expect(formatYenCompact(200_000_000)).toBe("¥2億");
  });
  it("compacts to 万 (rounded, grouped)", () => {
    expect(formatYenCompact(12_340_000)).toBe("¥1,234万");
    expect(formatYenCompact(50_000)).toBe("¥5万");
  });
  it("leaves sub-万 amounts as plain yen", () => {
    expect(formatYenCompact(3_000)).toBe("¥3,000");
  });
  it("carries a leading minus sign outside the mark", () => {
    expect(formatYenCompact(-150_000_000)).toBe("-¥1.5億");
  });
});

describe("compactJa (axis ticks, no mark)", () => {
  it("keeps a decimal in 万 rather than rounding", () => {
    expect(compactJa(55_000)).toBe("5.5万");
    expect(compactJa(12_340_000)).toBe("1234万");
  });
  it("compacts 億", () => {
    expect(compactJa(150_000_000)).toBe("1.5億");
  });
  it("does not group small integers", () => {
    expect(compactJa(3_000)).toBe("3000");
  });
});

describe("plain number / decimal / percent", () => {
  it("rounds and groups", () => {
    expect(formatNumber(1_234_567.8)).toBe("1,234,568");
  });
  it("formats decimals with fixed places", () => {
    expect(formatDecimal(3.14159)).toBe("3.1");
    expect(formatDecimal(3.14159, 2)).toBe("3.14");
  });
  it("turns a fraction into a percent", () => {
    expect(formatPercent(0.123)).toBe("12.3%");
    expect(formatPercent(0.5, 0)).toBe("50%");
  });
});

describe("formatDelta", () => {
  it("always shows a sign", () => {
    expect(formatDelta(0.123)).toBe("+12.3%");
    expect(formatDelta(-0.04)).toBe("-4.0%");
    expect(formatDelta(0)).toBe("+0.0%");
  });
});

describe("formatValue dispatch", () => {
  it("routes by format key", () => {
    expect(formatValue(1000, "yen")).toBe("¥1,000");
    expect(formatValue(200_000_000, "yenCompact")).toBe("¥2億");
    expect(formatValue(0.5, "percent")).toBe("50.0%");
    expect(formatValue(5, "decimal")).toBe("5.0");
    expect(formatValue(1234, "number")).toBe("1,234");
  });
  it("falls back to a plain number for unknown formats", () => {
    expect(formatValue(1234, "mystery")).toBe("1,234");
  });
});

describe("date helpers", () => {
  it("formats YM short and long", () => {
    expect(formatYm("2026-06")).toBe("6月");
    expect(formatYm("2026-06", true)).toBe("2026年6月");
  });
  it("formats ISO dates short and long", () => {
    expect(formatDate("2026-06-13")).toBe("6/13");
    expect(formatDate("2026-06-13", true)).toBe("6月13日");
  });
  it("formats a full date with weekday", () => {
    expect(formatDateFull("2026-06-13")).toMatch(/^2026\/6\/13（[日月火水木金土]）$/);
  });
});
