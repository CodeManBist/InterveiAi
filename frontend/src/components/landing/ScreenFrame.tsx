
import { cn } from "@/lib/utils";

export function ScreenFrame({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]",
        className
      )}
    >
      <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
          <span className="h-2.5 w-2.5 rounded-full bg-border" />
        </div>

        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {label}
        </span>
      </div>

      {children}
    </div>
  );
}

export function Waveform({
  bars = 28,
  className,
  active = true,
}) {
  return (
    <div
      className={cn(
        "flex h-10 items-center gap-[3px]",
        className
      )}
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full bg-primary",
            active ? "wave-bar" : "opacity-30"
          )}
          style={{
            height: `${18 + ((i * 37) % 22)}px`,
            animationDelay: `${(i % 9) * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

export default ScreenFrame;
