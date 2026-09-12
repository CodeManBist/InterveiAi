import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { interviews } from "@/lib/mock-data";

function InterviewsPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("date");

  let rows = interviews.filter(
    (interview) =>
      interview.role.toLowerCase().includes(query.toLowerCase()) &&
      (role === "all" || interview.role === role),
  );

  if (sort === "score") {
    rows = [...rows].sort(
      (a, b) => (b.score ?? 0) - (a.score ?? 0),
    );
  }

  const roles = Array.from(
    new Set(interviews.map((interview) => interview.role)),
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
        <PageHeader
          title="Interview History"
          subtitle="Review your previous interviews and track your progress."
          action={
            <Button className="flex items-center justify-center gap-2 py-5 px-3" asChild>
              <Link className="flex items-center justify-center gap-2" to="/new-interview   ">
                <Plus className="h-4 w-4" />
                New Interview
              </Link>
            </Button>
          }
        />

        {/* Filters */}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by role"
              className="pl-9"
            />
          </div>

          <Select
            value={role}
            onValueChange={setRole}
          >
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Role" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All roles
              </SelectItem>

              {roles.map((roleName) => (
                <SelectItem
                  key={roleName}
                  value={roleName}
                >
                  {roleName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sort}
            onValueChange={setSort}
          >
            <SelectTrigger className="sm:w-44">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="date">
                Newest first
              </SelectItem>

              <SelectItem value="score">
                Highest score
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Empty State / Interview Table */}
        {rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card px-8 py-20 text-center">
            <p className="serif-accent text-2xl text-primary">
              Nothing here yet.
            </p>

            <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
              Once you complete an interview it will appear here
              with its full report and score history.
            </p>

            <Button asChild className="mt-6">
              <Link to="/interview/new">
                Start your first interview
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {[
                    "Role",
                    "Date",
                    "Questions",
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
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-background"
                  >
                    <td className="px-5 py-3.5 font-medium">
                      {row.role}
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground">
                      {row.date}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-muted-foreground">
                      {row.questions}
                    </td>

                    <td className="px-5 py-3.5 font-mono">
                      {row.score ?? "—"}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="rounded-md bg-secondary px-2 py-1 font-mono text-[10px] tracking-wide uppercase">
                        {row.status}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/result/${row.id}`}
                        className="text-primary hover:underline"
                      >
                        View report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default InterviewsPage;