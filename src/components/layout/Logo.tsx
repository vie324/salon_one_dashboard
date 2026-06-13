import { cn } from "@/lib/cn";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.9 7.2 18l.9-5.4L4.2 8.7l5.4-.8L12 3z"
            fill="currentColor"
            opacity="0.95"
          />
        </svg>
      </div>
      {!compact && (
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Salon One
          </div>
          <div className="text-[10px] font-medium uppercase tracking-wide text-brand-500">
            経営ダッシュボード
          </div>
        </div>
      )}
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initial = name.trim().charAt(0);
  return (
    <div
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white",
        className,
      )}
    >
      {initial}
    </div>
  );
}
