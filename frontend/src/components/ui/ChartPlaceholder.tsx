import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface ChartPlaceholderProps {
  title: string;
  height?: string;
  className?: string;
}

export function ChartPlaceholder({ title, height = "h-44", className }: ChartPlaceholderProps) {
  return (
    <div className={cn("surface-card flex h-full flex-col p-5", className)}>
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
      </div>
      <div
        className={cn(
          "mt-4 flex flex-1 items-end justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 px-4 pb-3 pt-6",
          height
        )}
      >
        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
          <div
            key={i}
            className="w-full rounded-t bg-accent/70 transition-opacity hover:opacity-90"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">Özet görünüm — detay için Raporlar</p>
    </div>
  );
}
