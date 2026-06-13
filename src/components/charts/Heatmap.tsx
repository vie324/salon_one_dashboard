import { cn } from "@/lib/cn";

export function Heatmap({
  days,
  hours,
  matrix,
}: {
  days: string[];
  hours: number[];
  matrix: number[][];
}) {
  const max = Math.max(1, ...matrix.flat());
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[520px]">
        <div className="flex">
          <div className="w-8 shrink-0" />
          {hours.map((h) => (
            <div key={h} className="flex-1 pb-1 text-center text-[10px] text-slate-400">
              {h}
            </div>
          ))}
        </div>
        {days.map((d, di) => (
          <div key={d} className="flex items-center">
            <div className="w-8 shrink-0 pr-1 text-right text-[11px] font-medium text-slate-400">{d}</div>
            {hours.map((h, hi) => {
              const v = matrix[di][hi];
              const ratio = v / max;
              return (
                <div key={h} className="flex-1 px-0.5">
                  <div
                    title={`${d} ${h}:00 — ${v}件`}
                    className={cn(
                      "aspect-square w-full rounded-[5px] transition-transform hover:scale-110",
                      ratio === 0 && "bg-slate-100 dark:bg-slate-800",
                    )}
                    style={
                      ratio > 0
                        ? { backgroundColor: `rgba(15,118,110,${0.12 + ratio * 0.78})` }
                        : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        ))}
        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
          <span>少</span>
          {[0.15, 0.35, 0.55, 0.75, 0.95].map((o) => (
            <span key={o} className="h-3 w-3 rounded-sm" style={{ backgroundColor: `rgba(15,118,110,${o})` }} />
          ))}
          <span>多</span>
        </div>
      </div>
    </div>
  );
}
