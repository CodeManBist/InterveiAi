
import { ScreenFrame } from "./ScreenFrame";
import { ScoreLine } from "./ScoreLine";

export function DashboardPreview({ className }: { className?: string }) {
  return (
    <ScreenFrame
      label="kernel.app/dashboard"
      className={className}
    >
      <div className="bg-card px-5 py-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-medium">
            Performance over time
          </p>

          <span className="font-mono text-[11px] text-muted-foreground">
            Last 5 months
          </span>
        </div>

        <div className="mt-4 h-40">
          <ScoreLine />
        </div>

        <div className="mt-5 grid grid-cols-3 divide-x divide-border border-t border-border pt-4 text-center">
          {[
            ["Overall", "82"],
            ["Technical", "84"],
            ["Sessions", "12"],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                {k}
              </p>

              <p className="mt-1 text-xl font-semibold">
                {v}
              </p>
            </div>
          ))}
        </div>
      </div>
    </ScreenFrame>
  );
}

export default DashboardPreview;
