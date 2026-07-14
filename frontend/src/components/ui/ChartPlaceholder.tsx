import { cn } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface ChartPlaceholderProps {
  title: string;
  height?: string;
  className?: string;
}

export function ChartPlaceholder({ title, height = "h-48", className }: ChartPlaceholderProps) {
  return (
    <div className={cn("surface-card p-5 sm:p-6", className)}>
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary-600" />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div
        className={cn(
          "mt-4 flex items-end justify-between gap-2 rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-4 pb-4 pt-8",
          height
        )}
      >
        {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
          <div
            key={i}
            className="w-full rounded-t-md bg-gradient-to-t from-primary-600/80 to-primary-200/80 transition-all duration-300 hover:from-primary-700 hover:to-primary-300"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
