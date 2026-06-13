"use client";

import { Printer } from "lucide-react";

export function PrintButton({ label = "PDF出力" }: { label?: string }) {
  return (
    <button onClick={() => window.print()} className="btn btn-outline btn-md print:hidden">
      <Printer className="h-4 w-4" />
      {label}
    </button>
  );
}
