import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
}

interface LoadingStateProps {
  label: string;
  className?: string;
  spinnerClassName?: string;
}

export function LoadingSpinner({
  className,
}: LoadingSpinnerProps) {
  return (
    <Loader2
      aria-hidden="true"
      className={cn("h-4 w-4 animate-spin", className)}
    />
  );
}

export function LoadingState({
  label,
  className,
  spinnerClassName,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner
        className={cn("h-7 w-7 text-primary", spinnerClassName)}
      />
      <span className="text-sm text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
