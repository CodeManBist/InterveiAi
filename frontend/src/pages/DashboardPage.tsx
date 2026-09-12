import { Link } from "react-router-dom";
import { ArrowUpRight, Plus } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ScoreLine } from "@/components/landing/ScoreLine";
import { ScoreBar } from "@/components/landing/ScoreBar";
import { Button } from "@/components/ui/button";
import { focusAreas, interviews } from "@/lib/mock-data";

const stats = [
  {
    label: "Overall Score",
    value: "82",
    delta: "+8 vs last",
  },
  {
    label: "Technical Score",
    value: "84",
    delta: "+5 vs last",
  },
  {
    label: "Interviews Completed",
    value: "12",
    delta: "3 this month",
  },
];

function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
        <PageHeader
          title="Good morning."
          subtitle="Ready for your next interview?"
          action={
            <Button className="flex items-center justify-center gap-2 py-5 px-3" asChild>
              <Link className="flex items-center justify-center gap-2" to="/new-interview">
                <Plus className="h-4 w-4" />
                New Interview
              </Link>
            </Button>
          }
        />

        {/* Stats */}
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card px-5 py-5"
            >
              <p className="label-eyebrow">
                {stat.label}
              </p>

              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {stat.value}
              </p>

              <p className="mt-1 font-mono text-[11px] text-primary">
                {stat.delta}
              </p>
            </div>
          ))}
        </div>

        {/* Performance */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-medium">
              Performance Over Time
            </h2>

            <span className="font-mono text-[11px] text-muted-foreground">
              Score / 100
            </span>
          </div>

          <div className="mt-4 h-64 rounded-xl border border-border bg-card p-4">
            <ScoreLine />
          </div>
        </section>

        {/* Recent Interviews */}
        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-medium">
              Recent Interviews
            </h2>

            <Link
              to="/interviews"
              className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              View all
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {[
                    "Role",
                    "Date",
                    "Score",
                    "Status",
                    "",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3 font-mono text-[10px] font-normal tracking-widest text-muted-foreground uppercase"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {interviews.slice(0, 4).map((interview) => (
                  <tr
                    key={interview.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-background"
                  >
                    <td className="px-5 py-3.5 font-medium">
                      {interview.role}
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground">
                      {interview.date}
                    </td>

                    <td className="px-5 py-3.5 font-mono">
                      {interview.score ?? "—"}
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground">
                      {interview.status}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/result/${interview.id}`}
                        className="text-primary hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Focus Areas */}
        <section className="mt-12 max-w-lg">
          <h2 className="text-[15px] font-medium">
            Focus Areas
          </h2>

          <div className="mt-4 space-y-4">
            {focusAreas.map((focusArea) => (
              <ScoreBar
                key={focusArea.label}
                label={focusArea.label}
                value={focusArea.value}
              />
            ))}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

export default DashboardPage;