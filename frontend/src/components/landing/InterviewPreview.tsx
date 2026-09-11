
import { Mic, PhoneOff, Volume2 } from "lucide-react";

import {
  ScreenFrame,
  Waveform,
} from "./ScreenFrame";

import { cn } from "@/lib/utils";

export function InterviewPreview({ className }: { className?: string }) {
  return (
    <ScreenFrame
      label="kernel.app/interview/iv-2841"
      className={className}
    >
      <div className="bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 font-mono text-[10px] tracking-widest text-primary uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Live
            </span>

            <span className="text-[13px] font-medium">
              Full Stack Developer
            </span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
            <span>Question 04 / 10</span>
            <span className="text-foreground">18:42</span>
          </div>
        </div>

        {/* Interview content */}
        <div className="px-6 py-8 sm:px-10 sm:py-12">
          <p className="label-eyebrow">
            AI Interviewer
          </p>

          <p className="mt-3 max-w-md text-lg leading-snug font-medium sm:text-xl">
            “How would you optimize a slow MongoDB query on a
            collection with 40 million documents?”
          </p>

          <div className="mt-8 flex items-center gap-4">
            <Waveform />

            <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
              <Volume2 className="h-3.5 w-3.5" />
              Listening
            </span>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between border-t border-border bg-background px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Mic className="h-4 w-4" />
            </span>

            <span className="rounded-md border border-border px-3 py-2 font-mono text-[11px] text-muted-foreground">
              Mute
            </span>
          </div>

          <span
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-[11px]",
              "border border-destructive/30 text-destructive"
            )}
          >
            <PhoneOff className="h-3.5 w-3.5" />
            End interview
          </span>
        </div>
      </div>
    </ScreenFrame>
  );
}

export default InterviewPreview;

