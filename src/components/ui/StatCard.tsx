import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Sparkline } from "@/components/charts/charts";
import { AnimatedNumber } from "./AnimatedNumber";
import { HelpHint } from "./HelpHint";
import { DeltaPill } from "./primitives";

export interface StatCardProps {
  label: string;
  value: number;
  format: "yen" | "yenCompact" | "number" | "percent" | "decimal";
  delta?: number;
  /** When true, an increase is unfavourable (cancel rate, churn…). */
  invert?: boolean;
  compareLabel?: string;
  spark?: number[];
  sparkColor?: string;
  hint?: string;
  help?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  format,
  delta,
  invert,
  compareLabel = "前年同期比",
  spark,
  sparkColor = "#0f766e",
  hint,
  help,
  icon,
  className,
}: StatCardProps) {
  return (
    <div className={cn("card card-hover flex flex-col p-5", className)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
          {help && <HelpHint text={help} />}
        </span>
        {icon && <span className="text-slate-300 dark:text-slate-600">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[26px] font-bold leading-none tracking-tight tnum text-slate-900 dark:text-slate-50">
          <AnimatedNumber value={value} format={format} />
        </span>
      </div>
      {delta !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <DeltaPill value={delta} invert={invert} />
          <span className="text-xs text-slate-400">{compareLabel}</span>
        </div>
      )}
      {spark && spark.length > 1 && (
        <div className="mt-3 -mb-1">
          <Sparkline data={spark} color={sparkColor} height={38} />
        </div>
      )}
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
