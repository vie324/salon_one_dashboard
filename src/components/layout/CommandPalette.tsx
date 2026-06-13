"use client";

import { CornerDownLeft, Moon, Printer, Search, type LucideIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { NAV } from "@/lib/nav";

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  kind: "page" | "action";
  href?: string;
  run?: () => void;
}

function toggleTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem("theme", dark ? "dark" : "light");
  } catch {
    /* ignore */
  }
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const qs = sp.toString() ? `?${sp.toString()}` : "";
  const inputRef = useRef<HTMLInputElement>(null);

  const items: Item[] = useMemo(() => {
    const pages: Item[] = NAV.flatMap((g) =>
      g.items.map((it) => ({ id: it.href, label: it.label, hint: g.label, icon: it.icon, kind: "page" as const, href: it.href })),
    );
    const actions: Item[] = [
      { id: "act-theme", label: "テーマを切り替え（ライト / ダーク）", hint: "表示", icon: Moon, kind: "action", run: toggleTheme },
      { id: "act-print", label: "この画面をPDFで出力", hint: "操作", icon: Printer, kind: "action", run: () => window.print() },
    ];
    return [...pages, ...actions];
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => it.label.toLowerCase().includes(s) || (it.hint ?? "").toLowerCase().includes(s));
  }, [q, items]);

  useEffect(() => setActive(0), [q, open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      const t = setTimeout(() => inputRef.current?.focus(), 20);
      return () => clearTimeout(t);
    }
  }, [open]);

  function activate(it: Item) {
    setOpen(false);
    if (it.kind === "page" && it.href) router.push(it.href + qs);
    else it.run?.();
  }

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = filtered[active];
      if (it) activate(it);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh] print:hidden">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div
        className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-pop dark:border-slate-700 dark:bg-slate-900"
        onKeyDown={onListKey}
      >
        <div className="flex items-center gap-2.5 border-b px-4">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ページを検索、またはアクションを実行…"
            className="h-12 w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 dark:border-slate-700 sm:block">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 && <div className="px-3 py-10 text-center text-sm text-slate-400">該当する項目がありません</div>}
          {filtered.map((it, i) => (
            <button
              key={it.id}
              onMouseEnter={() => setActive(i)}
              onClick={() => activate(it)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                i === active ? "bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-200" : "text-slate-700 dark:text-slate-200",
              )}
            >
              <it.icon className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="flex-1 truncate">{it.label}</span>
              {it.hint && <span className="text-xs text-slate-400">{it.hint}</span>}
              {i === active && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-300" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
