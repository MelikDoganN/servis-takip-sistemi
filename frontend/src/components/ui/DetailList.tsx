import { cn } from "@/lib/utils";

interface DetailItem {
  label: string;
  value: React.ReactNode;
}

interface DetailListProps {
  items: DetailItem[];
  className?: string;
}

export function DetailList({ items, className }: DetailListProps) {
  return (
    <dl className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3"
        >
          <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {item.label}
          </dt>
          <dd className="mt-1 break-words text-sm font-medium text-navy">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
