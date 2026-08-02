import { cn } from "@/lib/utils";
import { EmptyState } from "./EmptyState";
import { BarChart3 } from "lucide-react";

interface ChartPlaceholderProps {
  title: string;
  height?: string;
  className?: string;
  description?: string;
}

/** Sahte grafik çizmez — gerçek veri yoksa boş durum gösterir. */
export function ChartPlaceholder({
  title,
  height = "h-44",
  className,
  description = "Bu rapor için henüz yeterli veri bulunmuyor.",
}: ChartPlaceholderProps) {
  return (
    <div
      className={cn(
        "surface-card flex flex-col overflow-hidden",
        height,
        className
      )}
    >
      <div className="border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <EmptyState
          className="py-6"
          icon={<BarChart3 className="h-5 w-5" />}
          title={description}
          description="Grafik yalnızca gerçek backend verisiyle gösterilir."
        />
      </div>
    </div>
  );
}
