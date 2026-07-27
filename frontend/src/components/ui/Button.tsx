import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-navy text-white shadow-soft hover:bg-primary-800 hover:shadow-card active:scale-[0.98] focus-visible:ring-accent",
  secondary:
    "bg-accent text-white shadow-soft hover:bg-accent-strong hover:shadow-card active:scale-[0.98] focus-visible:ring-accent",
  outline:
    "border border-slate-200 bg-white text-navy shadow-soft hover:border-accent/40 hover:bg-accent-soft hover:shadow-card active:scale-[0.98] focus-visible:ring-accent",
  ghost:
    "text-navy/80 hover:bg-primary-50 hover:text-navy active:scale-[0.98] focus-visible:ring-primary-300",
  danger:
    "bg-red-600 text-white shadow-soft hover:bg-red-700 hover:shadow-card active:scale-[0.98] focus-visible:ring-red-500",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      fullWidth = false,
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
