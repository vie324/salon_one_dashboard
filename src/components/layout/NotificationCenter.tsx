"use client";

import { AlertTriangle, Bell, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { AlertItem } from "@/lib/data";

export function NotificationCenter({ alerts }: { alerts: AlertItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const hasDanger = alerts.some((a) => a.level === "danger");

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn btn-ghost btn-icon relative" aria-label="要対応アラート">
        <Bell className="h-[18px] w-[18px]" />
        {alerts.length > 0 && (
          <span className={cn("absolute right-2 top-2 h-2 w-2 rounded-full ring-2 ring-white dark:ring-slate-950", hasDanger ? "bg-rose-500" : "bg-amber-500")} />
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right animate-scale-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">要対応アラート</span>
            <span className={cn("badge", hasDanger ? "badge-danger" : "badge-warning")}>{alerts.length}</span>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {alerts.length === 0 && <p className="px-3 py-8 text-center text-sm text-slate-400">現在アラートはありません</p>}
            {alerts.map((a, i) => {
              const Icon = a.level === "danger" ? AlertTriangle : a.level === "warning" ? TriangleAlert : Info;
              const tone = a.level === "danger" ? "text-rose-500" : a.level === "warning" ? "text-amber-500" : "text-sky-500";
              return (
                <Link key={i} href={a.href} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-lg px-2.5 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                  <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{a.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{a.detail}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
