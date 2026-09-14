
import { Link } from "react-router-dom";

import { SiteHeader } from "../components/common/SiteHeader";
import { SiteFooter } from "../components/common/SiteFooter";
import { InterviewPreview } from "../components/landing/InterviewPreview";
import { DashboardPreview } from "../components/landing/DashboardPreview";
import { ResultsPreview } from "../components/landing/ResultsPreview";
import { Button } from "@/components/ui/button";

const steps = [
  {
    n: "01",
    title: "Start",
    body: "Configure your interview.",
  },
  {
    n: "02",
    title: "Interview",
    body: "Talk through real technical questions.",
  },
  {
    n: "03",
    title: "Improve",
    body: "Review your performance and feedback.",
  },
];

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* 1 — Hero */}
      <section className="shell grid items-center gap-14 py-20 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20 lg:py-28">
        <div className="rise-in">
          <p className="label-eyebrow">AI technical interviews</p>

          <h1 className="mt-6 text-[38px] leading-[1.06] font-semibold tracking-[-0.03em] sm:text-[46px]">
            Practice technical interviews like they&apos;re{" "}
            <span className="serif-accent text-primary">real</span>.
          </h1>

          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Practice realistic technical interviews with an AI interviewer
            that asks, listens, and gives you actionable feedback.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/new-interview">Start an Interview</Link>
            </Button>

            <Button asChild size="lg" variant="outline">
              <Link to="/result/iv-2841">See Results</Link>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -top-5 -right-4 hidden h-32 w-32 rounded-xl bg-secondary lg:block" />

          <InterviewPreview className="relative" />
        </div>
      </section>

      {/* 2 — Product showcase */}
      <section className="border-t border-border py-24">
        <div className="shell">
          <h2 className="max-w-lg text-[30px] leading-tight font-semibold tracking-[-0.025em]">
            Everything happens in one place.
          </h2>

          <p className="mt-3 text-[15px] text-muted-foreground">
            Practice, review, and improve without leaving the platform.
          </p>

          <div className="mt-16 grid gap-16 lg:grid-cols-12 lg:gap-x-12">
            {/* Interview */}
            <div className="lg:col-span-8">
              <InterviewPreview />

              <div className="mt-5 flex gap-4">
                <span className="font-mono text-[11px] text-muted-foreground">
                  01
                </span>

                <p className="text-sm">
                  <span className="font-medium">Interview</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — one question at a time, spoken.
                  </span>
                </p>
              </div>
            </div>

            {/* Dashboard */}
            <div className="lg:col-span-4 lg:pt-24">
              <DashboardPreview />

              <div className="mt-5 flex gap-4">
                <span className="font-mono text-[11px] text-muted-foreground">
                  02
                </span>

                <p className="text-sm">
                  <span className="font-medium">Dashboard</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — progress across sessions.
                  </span>
                </p>
              </div>
            </div>

            {/* Results */}
            <div className="lg:col-span-10 lg:col-start-2">
              <ResultsPreview />

              <div className="mt-5 flex gap-4">
                <span className="font-mono text-[11px] text-muted-foreground">
                  03
                </span>

                <p className="text-sm">
                  <span className="font-medium">Results</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — scores with written feedback.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 — How it works */}
      <section className="border-t border-border py-24">
        <div className="shell">
          <h2 className="text-[30px] font-semibold tracking-[-0.025em]">
            Three steps to{" "}
            <span className="serif-accent text-primary">better</span>{" "}
            interviews.
          </h2>

          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-0">
            {steps.map((s) => (
              <li key={s.n} className="md:pr-10">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[11px] text-primary">
                    {s.n}
                  </span>

                  <span className="hidden h-px flex-1 bg-border md:block" />
                </div>

                <h3 className="mt-5 text-[15px] font-medium">
                  {s.title}
                </h3>

                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4 — Final CTA */}
      <section className="bg-primary py-24 text-primary-foreground">
        <div className="shell max-w-2xl text-center">
          <h2 className="text-[32px] leading-tight font-semibold tracking-[-0.03em] sm:text-[40px]">
            Be ready when the real interview starts.
          </h2>

          <p className="mx-auto mt-4 max-w-sm text-[15px] text-primary-foreground/75">
            Ten questions, one honest report.
          </p>

          <div className="mt-9">
            <Button asChild size="lg" variant="secondary">
              <Link to="/new-interview">Start an Interview</Link>
            </Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

export default LandingPage;

