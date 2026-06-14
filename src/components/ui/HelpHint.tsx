"use client";

import { Info } from "lucide-react";
import { useState } from "react";

/** Small (i) icon with an accessible tooltip explaining a metric. */
export function HelpHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label="説明"
        className="text-slate-300 transition hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-300"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          setOpen((o) => !o);
        }}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-1.5 w-52 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-normal leading-relaxed text-slate-600 shadow-pop dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          {text}
        </span>
      )}
    </span>
  );
}
