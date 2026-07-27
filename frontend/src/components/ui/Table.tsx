import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-100/90 bg-white/60 shadow-soft">
      <div className="overflow-auto">
        <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
      </div>
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 border-b border-primary-100 bg-gradient-to-r from-navy/[0.04] via-accent-soft/60 to-white backdrop-blur",
        className
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("[&_tr:nth-child(even)]:bg-surface/80", className)} {...props} />
  );
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-slate-100/90 transition-all duration-200",
        "hover:bg-accent-soft/70 hover:shadow-[inset_3px_0_0_0_#12A7CD]",
        "data-[state=selected]:bg-primary-50",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-12 px-4 text-left align-middle text-xs font-semibold uppercase tracking-wide text-navy/70",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3.5 align-middle text-slate-700", className)} {...props} />
  );
}
