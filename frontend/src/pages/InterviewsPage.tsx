import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { useApi } from "@/lib/useApi";

interface Interview {
  _id: string;

  candidateProfile?: {
    name?: string;
  };

  score?: {
    overall?: number;
    technical?: number;
    communication?: number;
    problemSolving?: number;
  };

  status:
    | "processing"
    | "ready"
    | "in-progress"
    | "completed";

  questionCount: number;
  createdAt: string;
}

function InterviewsPage() {
  const navigate = useNavigate();
  const api = useApi();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("date");

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await api.get("/interviews");

        setInterviews(response.data.interviews || []);
      } catch (error) {
        console.error("Failed to fetch interviews:", error);

        setError("Failed to load interviews.");
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, [api]);

  const roles = useMemo(() => {
    return Array.from(
      new Set(
        interviews
          .map((interview) => interview.candidateProfile?.name)
          .filter(Boolean),
      ),
    ) as string[];
  }, [interviews]);

  const rows = useMemo(() => {
    const filtered = interviews.filter((interview) => {
      const name =
        interview.candidateProfile?.name || "Interview";

      return (
        name.toLowerCase().includes(query.toLowerCase()) &&
        (role === "all" || name === role)
      );
    });

    if (sort === "score") {
      return [...filtered].sort(
        (a, b) =>
          (b.score?.overall ?? 0) -
          (a.score?.overall ?? 0),
      );
    }

    return [...filtered].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
  }, [interviews, query, role, sort]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatStatus = (status: Interview["status"]) => {
    return status.replace("-", " ");
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
        <PageHeader
          title="Interview History"
          subtitle="Review your previous interviews and track your progress."
          action={
            <Button
              className="flex items-center justify-center gap-2 px-3 py-5"
              asChild
            >
              <Link
                className="flex items-center justify-center gap-2"
                to="/new-interview"
              >
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
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search by candidate"
              className="pl-9"
            />
          </div>

          <Select
            value={role}
            onValueChange={setRole}
          >
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Candidate" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All candidates
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

        {/* Loading */}
        {loading ? (
          <div className="mt-8 rounded-xl border border-border bg-card px-8 py-20 text-center">
            <p className="text-sm text-muted-foreground">
              Loading interviews...
            </p>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-xl border border-border bg-card px-8 py-20 text-center">
            <p className="text-sm text-destructive">
              {error}
            </p>
          </div>
        ) : rows.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card px-8 py-20 text-center">
            <p className="serif-accent text-2xl text-primary">
              Nothing here yet.
            </p>

            <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
              Once you complete an interview it will appear here
              with its full report and score history.
            </p>

            <Button asChild className="mt-6">
              <Link to="/new-interview">
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
                    "Candidate",
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
                    key={row._id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-background"
                  >
                    <td className="px-5 py-3.5 font-medium">
                      {row.candidateProfile?.name ||
                        "Interview"}
                    </td>

                    <td className="px-5 py-3.5 text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>

                    <td className="px-5 py-3.5 font-mono text-muted-foreground">
                      {row.questionCount}
                    </td>

                    <td className="px-5 py-3.5 font-mono">
                      {row.score?.overall ?? "—"}
                    </td>

                    <td className="px-5 py-3.5">
                      <span className="rounded-md bg-secondary px-2 py-1 font-mono text-[10px] tracking-wide uppercase">
                        {formatStatus(row.status)}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={
                          row.status === "completed"
                            ? `/result/${row._id}`
                            : `/interview/${row._id}`
                        }
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