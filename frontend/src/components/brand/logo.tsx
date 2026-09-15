
import { cn } from "@/lib/utils";

export function Logo({
  className,
  labelClassName,
}: {
  className?: string;
  markClassName?: string;
  labelClassName?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center",
        className,
      )}
      aria-label="Intervue"
    >
      <span
        className={cn(
          "text-[18px] font-bold tracking-[-0.045em] text-primary",
          labelClassName,
        )}
      >
        Intervue
      </span>
    </span>
  );
}

/**
 * Compact Intervue mark.
 *
 * Used only where there isn't enough room
 * for the complete wordmark.
 */
export function LogoMark({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn(
        "h-7 w-7 text-primary",
        className,
      )}
      fill="none"
    >
      {/* V-inspired Intervue mark */}
      <path
        d="M6.5 8L13.5 23L20.5 8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Interview / AI signal */}
      <circle
        cx="24"
        cy="22"
        r="2.5"
        fill="currentColor"
      />
    </svg>
  );
}
