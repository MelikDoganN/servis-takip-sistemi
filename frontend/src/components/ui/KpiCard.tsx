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
        "group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft transition-all duration-300",
        "hover:-translate-y-1 hover:shadow-elevated",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-600 via-primary-500 to-sky-400 opacity-80" />
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-primary-50 to-transparent opacity-70 transition-transform duration-300 group-hover:scale-110" />

      <div className="relative flex items-start justify-between">
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl shadow-soft", iconBg)}>
          {icon}
        </div>
        {trend && (
          <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/80">
            {trend}
          </span>
        )}
      </div>
      <p className="relative mt-5 text-sm font-medium text-slate-500">{label}</p>
      <p className="relative mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {description && <p className="relative mt-2 text-xs text-slate-400">{description}</p>}
    </div>
  );
}
