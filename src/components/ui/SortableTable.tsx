"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { formatDecimal, formatNumber, formatPercent, formatYen, formatYenCompact } from "@/lib/format";
import { downloadCsv } from "@/lib/csv";
import { Badge, DeltaPill } from "./primitives";

type Tone = "brand" | "success" | "danger" | "warning" | "info" | "neutral";
type CellType = "entity" | "text" | "yen" | "yenCompact" | "number" | "decimal" | "percent" | "delta" | "badge";

export interface Column {
  key: string;
  label: string;
  type?: CellType;
  align?: "left" | "right" | "center";
  invert?: boolean; // delta direction
  signed?: boolean; // colour numeric by sign
  zeroDash?: boolean; // show — when 0
  suffix?: string;
  digits?: number;
}

export type Row = Record<string, string | number | undefined> & {
  _color?: string;
  _href?: string;
  _sub?: string;
};

function numeric(type?: CellType) {
  return type === "yen" || type === "yenCompact" || type === "number" || type === "decimal" || type === "percent" || type === "delta";
}

function display(col: Column, v: string | number | undefined): string {
  if (col.zeroDash && Number(v) === 0) return "—";
  switch (col.type) {
    case "yen": return formatYen(Number(v));
    case "yenCompact": return formatYenCompact(Number(v));
    case "number": return formatNumber(Number(v));
    case "decimal": return formatDecimal(Number(v), col.digits ?? 1) + (col.suffix ?? "");
    case "percent": return formatPercent(Number(v), col.digits ?? 1);
    default: return String(v ?? "");
  }
}

function csvValue(col: Column, row: Row): string | number {
  const v = row[col.key];
  if (col.type === "percent" || col.type === "delta") return Number(((Number(v) || 0) * 100).toFixed(1));
  if (numeric(col.type)) return Math.round(Number(v) || 0);
  return String(v ?? "");
}

export function SortableTable({
  columns,
  rows,
  defaultSort,
  searchable = false,
  searchKeys,
  exportName,
  initialDir = "desc",
}: {
  columns: Column[];
  rows: Row[];
  defaultSort?: string;
  searchable?: boolean;
  searchKeys?: string[];
  exportName?: string;
  initialDir?: "asc" | "desc";
}) {
  const [sortKey, setSortKey] = useState(defaultSort ?? columns[0].key);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);
  const [q, setQ] = useState("");

  const textKeys = searchKeys ?? columns.filter((c) => !numeric(c.type)).map((c) => c.key);

  const view = useMemo(() => {
    let r = rows;
    const s = q.trim().toLowerCase();
    if (s) r = r.filter((row) => textKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(s)));
    const col = columns.find((c) => c.key === sortKey);
    const num = numeric(col?.type);
    return [...r].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = num ? (Number(av) || 0) - (Number(bv) || 0) : String(av ?? "").localeCompare(String(bv ?? ""), "ja");
      return dir === "asc" ? cmp : -cmp;
    });
  }, [rows, q, sortKey, dir, columns, textKeys]);

  function toggleSort(key: string) {
    if (key === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setDir(numeric(columns.find((c) => c.key === key)?.type) ? "desc" : "asc");
    }
  }

  return (
    <div>
      {(searchable || exportName) && (
        <div className="flex items-center justify-between gap-2 px-5 pb-1 pt-1">
          {searchable ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="絞り込み…"
                className="input h-8 w-44 pl-8 text-xs"
              />
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{view.length} 件</span>
            {exportName && (
              <button
                onClick={() => downloadCsv(exportName, columns.map((c) => c.label), view.map((row) => columns.map((c) => csvValue(c, row))))}
                className="btn btn-ghost btn-sm text-slate-500 print:hidden"
                title="CSVをダウンロード"
              >
                CSV
              </button>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map((c) => (
                <th key={c.key} className={cn("th cursor-pointer select-none", c.align === "right" && "text-right", c.align === "center" && "text-center")} onClick={() => toggleSort(c.key)}>
                  <span className={cn("inline-flex items-center gap-1", c.align === "right" && "flex-row-reverse")}>
                    {c.label}
                    {sortKey === c.key ? (
                      dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ChevronsUpDown className="h-3 w-3 text-slate-300" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.map((row, i) => (
              <tr key={i} className="row-hover border-b border-slate-50 last:border-0 dark:border-slate-800/40">
                {columns.map((c) => (
                  <td key={c.key} className={cn("td", c.align === "right" && "text-right", c.align === "center" && "text-center", numeric(c.type) && "tnum")}>
                    <Cell col={c} row={row} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Cell({ col, row }: { col: Column; row: Row }) {
  const v = row[col.key];
  if (col.type === "entity") {
    const inner = (
      <span className="flex items-center gap-2 font-medium text-slate-800 dark:text-slate-100">
        {row._color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: row._color }} />}
        {String(v ?? "")}
      </span>
    );
    return (
      <div>
        {row._href ? (
          <Link href={row._href} className="hover:text-brand-600">{inner}</Link>
        ) : (
          inner
        )}
        {row._sub && <span className="ml-[18px] text-xs text-slate-400">{row._sub}</span>}
      </div>
    );
  }
  if (col.type === "badge") {
    const tone = (row[`${col.key}Tone`] as Tone) ?? "neutral";
    return <Badge tone={tone}>{String(v ?? "")}</Badge>;
  }
  if (col.type === "delta") {
    return <span className="flex justify-end"><DeltaPill value={Number(v) || 0} invert={col.invert} bare /></span>;
  }
  const text = display(col, v);
  const signedClass = col.signed ? (Number(v) < 0 ? "text-rose-600 dark:text-rose-400" : Number(v) > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400") : "";
  return <span className={signedClass}>{text}</span>;
}
