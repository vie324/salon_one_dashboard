"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-500 dark:bg-rose-500/15">
        <TriangleAlert className="h-7 w-7" />
      </span>
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">表示中に問題が発生しました</h2>
        <p className="mt-1 text-sm text-slate-500">一時的なエラーの可能性があります。再読み込みをお試しください。</p>
      </div>
      <button onClick={reset} className="btn btn-primary btn-md">
        <RotateCcw className="h-4 w-4" /> 再試行
      </button>
    </div>
  );
}
