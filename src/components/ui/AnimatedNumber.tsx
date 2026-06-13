"use client";

import { useEffect, useRef, useState } from "react";
import { formatValue } from "@/lib/format";

/**
 * Shows `value`, and smoothly counts to the new value whenever it changes
 * (e.g. when the period/brand/store filter updates). The first render uses the
 * real value (SSR-correct, no flash); only subsequent changes animate.
 */
export function AnimatedNumber({
  value,
  format,
  duration = 800,
}: {
  value: number;
  format: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const displayRef = useRef(value);
  const mounted = useRef(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      displayRef.current = value;
      setDisplay(value);
      return;
    }
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      displayRef.current = value;
      setDisplay(value);
      return;
    }
    const from = displayRef.current;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const current = from + (value - from) * eased;
      displayRef.current = current;
      setDisplay(current);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, duration]);

  return <>{formatValue(display, format)}</>;
}
