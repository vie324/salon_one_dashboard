import { describe, expect, it } from "vitest";
import {
  GENRE_BASE_GROWTH,
  achievement,
  paceStatus,
  presetGrowth,
  targetFor,
} from "./budget";

describe("presetGrowth", () => {
  it("returns the base growth per genre under the standard scenario", () => {
    expect(presetGrowth("standard")).toEqual(GENRE_BASE_GROWTH);
  });
  it("shifts every genre down for the conservative scenario, never below 0", () => {
    const g = presetGrowth("conservative");
    expect(g.hair).toBeCloseTo(0.03, 6);
    expect(g.esthetic).toBeCloseTo(0.09, 6);
    for (const v of Object.values(g)) expect(v).toBeGreaterThanOrEqual(0);
  });
  it("shifts every genre up for the aggressive scenario", () => {
    const g = presetGrowth("aggressive");
    expect(g.hair).toBeCloseTo(0.1, 6);
    expect(g.eyelash).toBeCloseTo(0.14, 6);
  });
});

describe("targetFor", () => {
  it("grows revenue by the rate", () => {
    expect(targetFor("revenue", 1000, 0.06)).toBeCloseTo(1060, 6);
  });
  it("grows a profitable baseline but floors a loss at break-even", () => {
    expect(targetFor("profit", 1000, 0.06)).toBeCloseTo(1060, 6);
    expect(targetFor("profit", -500, 0.06)).toBe(0);
    expect(targetFor("profit", 0, 0.06)).toBe(0);
  });
  it("grows count metrics", () => {
    expect(targetFor("customers", 200, 0.1)).toBeCloseTo(220, 6);
  });
});

describe("achievement", () => {
  it("is actual / target for a positive target", () => {
    expect(achievement(80, 100)).toBeCloseTo(0.8, 6);
  });
  it("treats a non-positive target as met only when actual clears it", () => {
    expect(achievement(100, 0)).toBe(1);
    expect(achievement(0, 0)).toBe(1);
    expect(achievement(-5, 0)).toBe(0);
  });
});

describe("paceStatus", () => {
  it("maps forecast achievement to a labelled tone", () => {
    expect(paceStatus(1.1)).toEqual({ label: "達成見込", tone: "success" });
    expect(paceStatus(1)).toEqual({ label: "達成見込", tone: "success" });
    expect(paceStatus(0.97)).toEqual({ label: "ほぼ達成", tone: "warning" });
    expect(paceStatus(0.95)).toEqual({ label: "ほぼ達成", tone: "warning" });
    expect(paceStatus(0.8)).toEqual({ label: "未達見込", tone: "danger" });
  });
});
