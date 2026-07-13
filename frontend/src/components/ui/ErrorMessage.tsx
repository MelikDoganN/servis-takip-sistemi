import { cn } from "@/lib/utils";

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export function ErrorMessage({ message, className }: ErrorMessageProps) {
  return (
    <div className={cn("rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700", className)}>
      {message}
    </div>
  );
}
