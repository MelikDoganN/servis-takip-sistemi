import { cn } from "@/lib/utils";

export interface StatusBarChartItem {
  label: string;
  value: number;
  colorClass: string;
}

interface StatusBarChartProps {
  items: StatusBarChartItem[];
  className?: string;
}

/** Gerçek verilerle beslenen yatay bar grafik (durum dağılımı gibi sayısal kırılımlar için). */
export function StatusBarChart({ items, className }: StatusBarChartProps) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const max = Math.max(1, ...items.map((item) => item.value));

  return (
    <div className={cn("space-y-4", className)}>
      {items.map((item) => {
        const widthPct = Math.round((item.value / max) * 100);
        const sharePct = total > 0 ? Math.round((item.value / total) * 100) : 0;
        return (
          <div key={item.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{item.label}</span>
              <span className="text-slate-500">
                {item.value}
                {total > 0 && (
                  <span className="ml-1 text-xs text-slate-400">({sharePct}%)</span>
                )}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full rounded-full transition-all duration-500", item.colorClass)}
                style={{ width: `${item.value === 0 ? 0 : Math.max(widthPct, 3)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
