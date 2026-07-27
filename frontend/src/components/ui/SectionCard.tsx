import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  noPadding,
}: SectionCardProps) {
  return (
    <div className={cn("surface-card overflow-hidden card-hover", className)}>
      <div className="flex flex-col gap-3 border-b border-primary-50 bg-gradient-to-r from-white via-white to-accent-soft/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <div className="mb-1 h-0.5 w-10 rounded-full bg-gradient-to-r from-navy to-accent" />
          <h3 className="text-sm font-semibold tracking-tight text-navy sm:text-base">
            {title}
          </h3>
          {description && (
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className={cn(!noPadding && "p-5 sm:p-6")}>{children}</div>
    </div>
  );
}
