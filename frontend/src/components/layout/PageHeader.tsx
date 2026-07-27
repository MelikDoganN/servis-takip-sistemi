interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({ title, description, action, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-navy to-accent text-white shadow-card ring-1 ring-accent/20">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy sm:text-[1.65rem]">
            {title}
          </h2>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}
