"use client";

import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/csv";

export function ExportCsvButton({
  filename,
  headers,
  rows,
  label = "CSV",
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  label?: string;
}) {
  return (
    <button
      onClick={() => downloadCsv(filename, headers, rows)}
      className="btn btn-outline btn-sm print:hidden"
      title="CSVをダウンロード"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
