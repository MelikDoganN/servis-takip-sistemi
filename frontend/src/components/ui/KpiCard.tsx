import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  trend?: string;
  description?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  iconBg,
  trend,
  description,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-4 shadow-card",
        "transition-shadow duration-200 hover:shadow-elevated",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            iconBg
          )}
        >
          {icon}
        </div>
        {trend && (
          <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-strong">
            {trend}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-navy tabular-nums">
        {value}
      </p>
      {description && (
        <p className="mt-1 text-xs leading-snug text-slate-400">{description}</p>
      )}
    </div>
  );
}
