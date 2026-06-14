"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import { NAV, ROLES, canAccess, type Role } from "@/lib/nav";
import { useUiPrefs } from "@/components/providers/UiPrefs";
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
  const { role, setRole } = useUiPrefs();
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => canAccess(role, i.href)) })).filter((g) => g.items.length);

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
        {groups.map((group) => (
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
        {!collapsed ? (
          <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
            <div className="flex items-center gap-2.5 px-1 pb-2">
              <Avatar name="経営管理本部" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">経営管理本部</p>
                <p className="truncate text-[11px] text-slate-400">info@viecompany.net</p>
              </div>
            </div>
            <label className="block px-1">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-400">表示ロール（デモ）</span>
              <select className="select h-8 w-full text-xs" value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="flex justify-center">
            <Avatar name="経営管理本部" />
          </div>
        )}
      </div>
    </div>
  );
}
