// Shared categorical palette. Kept in a plain (non-"use client") module so
// both server components and client charts can read/index it freely.
// Teal + gold lead, then distinct supporting hues — harmonised with the brand.
export const CHART_COLORS = [
  "#0f766e", // teal (brand)
  "#c0a060", // gold (accent)
  "#be185d", // rose
  "#2563eb", // blue
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#b45309", // bronze
  "#15803d", // green
];
