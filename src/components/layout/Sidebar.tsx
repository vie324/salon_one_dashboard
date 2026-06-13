"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV } from "@/lib/nav";
import { Avatar, Logo } from "./Logo";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function Sidebar({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const qs = search.toString() ? `?${search.toString()}` : "";

  return (
    <div className="flex h-full flex-col">
      {/* header */}
      <div className={cn("flex h-16 items-center px-4", collapsed ? "justify-center" : "justify-between")}>
        <Logo compact={collapsed} />
        {onToggleCollapse && !collapsed && (
          <button onClick={onToggleCollapse} className="btn btn-ghost btn-icon hidden lg:flex" aria-label="サイドバーを折りたたむ">
            <PanelLeftClose className="h-[18px] w-[18px]" />
          </button>
        )}
      </div>

      {collapsed && onToggleCollapse && (
        <button onClick={onToggleCollapse} className="btn btn-ghost btn-icon mx-auto mb-2 hidden lg:flex" aria-label="サイドバーを開く">
          <PanelLeftOpen className="h-[18px] w-[18px]" />
        </button>
      )}

      {/* nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {NAV.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href + qs}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={cn("nav-link", active && "nav-link-active", collapsed && "justify-center px-0")}
                  >
                    <item.icon className="h-[18px] w-[18px] shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* footer */}
      <div className="border-t p-3">
        <div className={cn("flex items-center gap-2.5 rounded-xl px-2 py-2", !collapsed && "bg-slate-50 dark:bg-slate-900")}>
          <Avatar name="経営管理本部" />
          {!collapsed && (
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">経営管理本部</p>
              <p className="truncate text-[11px] text-slate-400">info@viecompany.net</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
