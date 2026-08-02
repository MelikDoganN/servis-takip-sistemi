import { SelectHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, id, children, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "field-base appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-9",
            "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 fill=%27none%27 viewBox=%270 0 24 24%27 stroke=%27%2394a3b8%27%3E%3Cpath stroke-linecap=%27round%27 stroke-linejoin=%27round%27 stroke-width=%272%27 d=%27M19 9l-7 7-7-7%27/%3E%3C/svg%3E')]",
            error && "border-red-400 focus:border-red-500 focus:ring-red-500/15",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
        {!error && hint && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
