"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { UiPrefsProvider } from "@/components/providers/UiPrefs";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "./Sidebar";
import { Splash } from "./Splash";
import { Topbar } from "./Topbar";
import type { FilterBrand, FilterStore } from "./FilterBar";
import type { AlertItem } from "@/lib/data";

export function AppShell({
  brands,
  stores,
  alerts,
  children,
}: {
  brands: FilterBrand[];
  stores: FilterStore[];
  alerts: AlertItem[];
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    } catch {
      /* ignore */
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <UiPrefsProvider>
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden border-r bg-white dark:bg-slate-950 lg:flex lg:flex-col print:hidden",
          "transition-[width] duration-200",
          collapsed ? "w-[76px]" : "w-[264px]",
        )}
      >
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] animate-fade-in flex-col border-r bg-white shadow-pop dark:bg-slate-950">
            <button onClick={() => setMobileOpen(false)} className="btn btn-ghost btn-icon absolute right-2 top-3 z-10" aria-label="閉じる">
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className={cn("transition-[padding] duration-200 print:!pl-0", collapsed ? "lg:pl-[76px]" : "lg:pl-[264px]")}>
        <Topbar brands={brands} stores={stores} alerts={alerts} onMenu={() => setMobileOpen(true)} />
        <main className="px-4 py-6 lg:px-6 lg:py-7 print:!p-0">
          <div key={pathname} className="mx-auto max-w-[1440px] animate-fade-up">{children}</div>
        </main>
      </div>

      <Splash />
      <CommandPalette />
    </div>
    </UiPrefsProvider>
  );
}
