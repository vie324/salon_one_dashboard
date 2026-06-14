"use client";

import { Menu, Rows3, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { routeTitle } from "@/lib/nav";
import type { AlertItem } from "@/lib/data";
import { useUiPrefs } from "@/components/providers/UiPrefs";
import { Avatar } from "./Logo";
import { FilterBar, type FilterBrand, type FilterStore } from "./FilterBar";
import { NotificationCenter } from "./NotificationCenter";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({
  brands,
  stores,
  alerts,
  onMenu,
}: {
  brands: FilterBrand[];
  stores: FilterStore[];
  alerts: AlertItem[];
  onMenu: () => void;
}) {
  const pathname = usePathname();
  const title = routeTitle(pathname);
  const { density, setDensity } = useUiPrefs();

  return (
    <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur-md dark:bg-slate-950/80 print:hidden">
      <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
        <button onClick={onMenu} className="btn btn-ghost btn-icon lg:hidden" aria-label="メニュー">
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="hidden text-[11px] font-medium text-slate-400 sm:block">Salon One Holdings</div>
          <h1 className="truncate text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h1>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden xl:block">
            <FilterBar brands={brands} stores={stores} />
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event("open-command"))}
            className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-400 transition hover:bg-slate-50 hover:text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 md:flex"
            aria-label="検索・移動"
          >
            <Search className="h-4 w-4" />
            <span className="hidden lg:inline">検索・移動</span>
            <kbd className="rounded border border-slate-200 px-1 text-[10px] dark:border-slate-700">⌘K</kbd>
          </button>
          <button
            onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
            className="btn btn-ghost btn-icon hidden sm:flex"
            aria-label="表示密度"
            title={density === "compact" ? "標準表示に切替" : "コンパクト表示に切替"}
          >
            <Rows3 className="h-[18px] w-[18px]" />
          </button>
          <ThemeToggle />
          <NotificationCenter alerts={alerts} />
          <div className="ml-1 hidden items-center gap-2 sm:flex">
            <Avatar name="経営管理本部" />
          </div>
        </div>
      </div>

      {/* filters on a second row below xl */}
      <div className="overflow-x-auto border-t px-4 py-2 xl:hidden">
        <FilterBar brands={brands} stores={stores} />
      </div>
    </header>
  );
}
