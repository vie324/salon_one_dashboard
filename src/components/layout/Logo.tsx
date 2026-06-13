import { cn } from "@/lib/cn";

/* eslint-disable @next/next/no-img-element */

export function Logo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <img
        src="/logo-tile.png"
        alt="Salon One"
        width={36}
        height={36}
        className="h-9 w-9 rounded-[10px] shadow-sm"
      />
    );
  }
  return (
    <>
      {/* light mode */}
      <img src="/logo-horizontal.png" alt="Salon One 経営ダッシュボード" className="h-9 w-auto dark:hidden" />
      {/* dark mode (cream + gold) */}
      <img src="/logo-horizontal-light.png" alt="Salon One 経営ダッシュボード" className="hidden h-9 w-auto dark:block" />
    </>
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
