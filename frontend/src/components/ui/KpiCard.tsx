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
        "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card",
        "transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:border-accent/30 hover:shadow-elevated",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-navy via-accent to-primary-300" />
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-accent/15 to-transparent transition-transform duration-500 group-hover:scale-125" />
      <div className="absolute -bottom-10 -left-6 h-24 w-24 rounded-full bg-navy/5 transition-transform duration-500 group-hover:scale-110" />

      <div className="relative flex items-start justify-between">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-2xl shadow-soft ring-1 ring-white/60 transition-transform duration-300 group-hover:scale-105",
            iconBg
          )}
        >
          {icon}
        </div>
        {trend && (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-strong ring-1 ring-accent/20">
            {trend}
          </span>
        )}
      </div>
      <p className="relative mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="relative mt-1 text-3xl font-semibold tracking-tight text-navy">
        {value}
      </p>
      {description && (
        <p className="relative mt-2 text-xs text-slate-400">{description}</p>
      )}
    </div>
  );
}
