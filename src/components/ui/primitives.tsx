import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatDelta } from "@/lib/format";

// ---- Card ---------------------------------------------------------------

export function Card({
  className,
  children,
  hover,
}: {
  className?: string;
  children: ReactNode;
  hover?: boolean;
}) {
  return (
    <div className={cn("card", hover && "card-hover", className)}>{children}</div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="flex items-start gap-2.5">
        {icon && <div className="mt-0.5 text-slate-400">{icon}</div>}
        <div>
          <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// ---- Badge --------------------------------------------------------------

type Tone = "brand" | "success" | "danger" | "warning" | "info" | "neutral";

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("badge", `badge-${tone}`, className)}>{children}</span>;
}

// ---- Delta pill ---------------------------------------------------------

export function DeltaPill({
  value,
  invert,
  className,
  bare,
}: {
  value: number;
  /** When true, a positive value is "bad" (e.g. cancel/churn rate). */
  invert?: boolean;
  className?: string;
  bare?: boolean;
}) {
  const positive = value > 0.0005;
  const negative = value < -0.0005;
  const good = invert ? negative : positive;
  const bad = invert ? positive : negative;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : ArrowRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-semibold tnum",
        !bare && "rounded-md px-1.5 py-0.5",
        good && (bare ? "text-emerald-600 dark:text-emerald-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"),
        bad && (bare ? "text-rose-600 dark:text-rose-400" : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"),
        !good && !bad && (bare ? "text-slate-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"),
        className,
      )}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} />
      {formatDelta(value)}
    </span>
  );
}

// ---- Progress bar -------------------------------------------------------

export function ProgressBar({
  value,
  tone = "brand",
  className,
}: {
  value: number; // 0..1
  tone?: "brand" | "emerald" | "amber" | "rose" | "sky";
  className?: string;
}) {
  const toneClass = {
    brand: "bg-brand-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    sky: "bg-sky-500",
  }[tone];
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", className)}>
      <div
        className={cn("h-full rounded-full transition-all", toneClass)}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  );
}

// ---- Section heading ----------------------------------------------------

export function SectionHeading({
  title,
  subtitle,
  actions,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

// ---- Empty state --------------------------------------------------------

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ---- Table helpers ------------------------------------------------------

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("w-full border-collapse text-sm", className)}>{children}</table>
    </div>
  );
}
