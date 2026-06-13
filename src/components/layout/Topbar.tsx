"use client";

import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { routeTitle } from "@/lib/nav";
import { Avatar } from "./Logo";
import { FilterBar, type FilterBrand, type FilterStore } from "./FilterBar";
import { ThemeToggle } from "./ThemeToggle";

export function Topbar({
  brands,
  stores,
  onMenu,
}: {
  brands: FilterBrand[];
  stores: FilterStore[];
  onMenu: () => void;
}) {
  const pathname = usePathname();
  const title = routeTitle(pathname);

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
          <ThemeToggle />
          <Link href="/" className="btn btn-ghost btn-icon relative" aria-label="アラート" title="要対応アラート">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-950" />
          </Link>
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
