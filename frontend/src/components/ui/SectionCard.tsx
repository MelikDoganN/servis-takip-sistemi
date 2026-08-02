import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
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
    <div className={cn("surface-card overflow-hidden", className)}>
      {(title || action) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            {title && (
              <h3 className="text-sm font-semibold tracking-tight text-navy sm:text-[0.9375rem]">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
          {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={cn(!noPadding && "p-5 sm:p-6")}>{children}</div>
    </div>
  );
}
