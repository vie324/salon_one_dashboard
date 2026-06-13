// Formatting helpers — Japanese-aware (万 / 億 compacting, JPY, %).

export function formatYen(n: number): string {
  return "¥" + Math.round(n).toLocaleString("ja-JP");
}

/** Compact JPY using 万 / 億 — common in Japanese management reports. */
export function formatYenCompact(n: number): string {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e8) {
    return `${sign}¥${trim(v / 1e8)}億`;
  }
  if (v >= 1e4) {
    return `${sign}¥${Math.round(v / 1e4).toLocaleString("ja-JP")}万`;
  }
  return `${sign}¥${Math.round(v).toLocaleString("ja-JP")}`;
}

/** Compact without the yen mark — for axis ticks. */
export function compactJa(n: number): string {
  const sign = n < 0 ? "-" : "";
  const v = Math.abs(n);
  if (v >= 1e8) return `${sign}${trim(v / 1e8)}億`;
  if (v >= 1e4) return `${sign}${trim(v / 1e4)}万`;
  return `${sign}${Math.round(v)}`;
}

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}

export function formatDecimal(n: number, digits = 1): string {
  return n.toLocaleString("ja-JP", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Fraction → percent string, e.g. 0.123 → "12.3%". */
export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Signed percent for deltas, e.g. +12.3% / -4.0%. */
export function formatDelta(fraction: number, digits = 1): string {
  const pct = (fraction * 100).toFixed(digits);
  return `${fraction >= 0 ? "+" : ""}${pct}%`;
}

export function formatValue(value: number, format: string): string {
  switch (format) {
    case "yen":
      return formatYen(value);
    case "yenCompact":
      return formatYenCompact(value);
    case "percent":
      return formatPercent(value);
    case "decimal":
      return formatDecimal(value);
    default:
      return formatNumber(value);
  }
}

function trim(n: number): string {
  // 1 decimal place, but drop a trailing ".0"
  const s = n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

// ---- Dates ---------------------------------------------------------------

/** "2026-06" → "6月" (short) or "2026年6月" (long). */
export function formatYm(ym: string, long = false): string {
  const [y, m] = ym.split("-");
  return long ? `${y}年${Number(m)}月` : `${Number(m)}月`;
}

/** ISO date "2026-06-13" → "6/13" or "6月13日". */
export function formatDate(iso: string, long = false): string {
  const d = new Date(iso + "T00:00:00");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return long ? `${m}月${day}日` : `${m}/${day}`;
}

export function formatDateFull(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${w}）`;
}
