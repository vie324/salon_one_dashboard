// Deterministic pseudo-random helpers.
// All mock data is generated from fixed seeds so that server and client renders
// agree (no hydration mismatch) and figures stay stable between reloads.

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

export function rngFor(...keys: (string | number)[]): Rng {
  return mulberry32(hashString(keys.join("|")));
}

export function randInt(r: Rng, min: number, max: number): number {
  return Math.floor(r() * (max - min + 1)) + min;
}

export function randFloat(r: Rng, min: number, max: number): number {
  return r() * (max - min) + min;
}

/** Multiply `base` by a random factor within ±pct. */
export function jitter(r: Rng, base: number, pct: number): number {
  return base * (1 + randFloat(r, -pct, pct));
}

export function pick<T>(r: Rng, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

/** A smooth-ish seasonal multiplier for a given month index (0-11). */
export function seasonality(monthIndex: number): number {
  // Beauty industry: strong Dec (year-end), Mar (graduation/new life),
  // softer Jan/Feb & Aug. Values centred around 1.0.
  const table = [
    0.92, 0.9, 1.12, 1.06, 0.98, 0.95, 1.0, 0.93, 0.97, 1.02, 1.05, 1.18,
  ];
  return table[((monthIndex % 12) + 12) % 12];
}
