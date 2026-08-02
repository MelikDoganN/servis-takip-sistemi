interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function PageHeader({ title, description, action, icon }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-navy sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-0.5 max-w-2xl text-sm text-slate-500">
              {description}
            </p>
          )}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
