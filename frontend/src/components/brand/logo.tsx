import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string | undefined }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("h-7 w-7 text-primary", className)}
      fill="none"
    >
      <rect x="1.25" y="1.25" width="29.5" height="29.5" rx="7" fill="currentColor" />
      <path d="M9 22V10.5L16 17.5L23 10.5V22" stroke="var(--color-ivory)" strokeWidth="2.4" />
      <circle cx="23" cy="22" r="2" fill="var(--color-terracotta)" />
    </svg>
  );
}

export function Logo({
  className,
  markClassName,
  labelClassName,
}: {
  className?: string | undefined;
  markClassName?: string | undefined;
  labelClassName?: string | undefined;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={markClassName} />
      <span className={cn("text-[15px] font-semibold tracking-[-0.01em]", labelClassName)}>
        Kernel
      </span>
    </span>
  );
}
