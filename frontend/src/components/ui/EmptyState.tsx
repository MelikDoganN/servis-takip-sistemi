import { cn } from "@/lib/utils";

interface EmptyStateProps {
  message: string;
  className?: string;
}

export function EmptyState({ message, className }: EmptyStateProps) {
  return (
    <div className={cn("py-12 text-center text-sm text-gray-400", className)}>
      {message}
    </div>
  );
}
