
import { ScreenFrame } from "./ScreenFrame";
import { ScoreBar } from "./ScoreBar";

export function ResultsPreview({ className }: { className?: string }) {
  return (
    <ScreenFrame
      label="kernel.app/result/iv-2841"
      className={className}
    >
      <div className="bg-card">
        {/* Score summary */}
        <div className="grid gap-6 border-b border-border px-6 py-6 sm:grid-cols-[auto_1fr] sm:gap-10">
          <div>
            <p className="label-eyebrow">
              Overall
            </p>

            <p className="mt-1 text-5xl font-semibold tracking-tight">
              82
              <span className="text-xl font-normal text-muted-foreground">
                {" "}
                / 100
              </span>
            </p>
          </div>

          <div className="grid content-center gap-3">
            <ScoreBar label="Technical" value={84} />
            <ScoreBar label="Problem Solving" value={88} />
            <ScoreBar label="Communication" value={76} />
          </div>
        </div>

        {/* Feedback */}
        <div className="grid gap-6 px-6 py-6 sm:grid-cols-2">
          <div>
            <p className="label-eyebrow">
              Strengths
            </p>

            <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
              <li>
                Strong grasp of the Node.js event loop and async
                semantics.
              </li>

              <li>
                Answers structured conclusion-first, easy to follow.
              </li>
            </ul>
          </div>

          <div>
            <p className="label-eyebrow">
              Areas to improve
            </p>

            <ul className="mt-3 space-y-2 text-[13px] text-muted-foreground">
              <li>
                Quantify trade-offs when proposing a caching layer.
              </li>

              <li>
                Slow down on system design before jumping to schema.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </ScreenFrame>
  );
}

export default ResultsPreview;
