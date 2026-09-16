import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Plus } from "lucide-react";
import { useUser } from "@clerk/react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ScoreLine } from "@/components/landing/ScoreLine";
import { ScoreBar } from "@/components/landing/ScoreBar";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/useApi";

interface InterviewScore {
  overall?: number;
  technical?: number;
  communication?: number;
  problemSolving?: number;
  feedback?: string;
  strengths?: string[];
  weaknesses?: string[];
}

interface Interview {
  _id: string;

  candidateProfile?: {
    name?: string;
    summary?: string;
  };

  score?: InterviewScore;

  status:
    | "processing"
    | "ready"
    | "in-progress"
    | "completed";

  questionCount: number;
  createdAt: string;
  updatedAt?: string;
}

function DashboardPage() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn, user } = useUser();
  const api = useApi();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/api/users/me");
        setProfileImage(response.data.user.profileImage);
      } catch (error) {
        console.log("Error fetching user profile", error);
      }
    };

    fetchUser();
  }, [api]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }

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
  }, [api, isLoaded, isSignedIn]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      navigate("/login");
    }
  }, [isLoaded, isSignedIn, navigate]);

  const completedInterviews = useMemo(() => {
    return interviews.filter(
      (interview) =>
        interview.status === "completed" &&
        interview.score?.overall !== undefined,
    );
  }, [interviews]);

  const averageOverallScore = useMemo(() => {
    if (completedInterviews.length === 0) {
      return null;
    }

    const total = completedInterviews.reduce(
      (sum, interview) => sum + (interview.score?.overall ?? 0),
      0,
    );

    return Math.round(total / completedInterviews.length);
  }, [completedInterviews]);

  const averageTechnicalScore = useMemo(() => {
    const scored = completedInterviews.filter(
      (interview) => interview.score?.technical !== undefined,
    );

    if (scored.length === 0) {
      return null;
    }

    const total = scored.reduce(
      (sum, interview) => sum + (interview.score?.technical ?? 0),
      0,
    );

    return Math.round(total / scored.length);
  }, [completedInterviews]);

  const focusAreas = useMemo(() => {
    const getAverage = (
      field: "technical" | "communication" | "problemSolving",
    ) => {
      const scored = completedInterviews.filter(
        (interview) => interview.score?.[field] !== undefined,
      );

      if (scored.length === 0) {
        return 0;
      }

      const total = scored.reduce(
        (sum, interview) => sum + (interview.score?.[field] ?? 0),
        0,
      );

      return Math.round(total / scored.length);
    };

    return [
      {
        label: "Technical",
        value: getAverage("technical"),
      },
      {
        label: "Communication",
        value: getAverage("communication"),
      },
      {
        label: "Problem Solving",
        value: getAverage("problemSolving"),
      },
    ];
  }, [completedInterviews]);

  const performanceData = useMemo(() => {
    return [...completedInterviews]
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() -
          new Date(b.createdAt).getTime(),
      )
      .map((interview) => ({
        label: new Date(interview.createdAt).toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
          },
        ),
        score: interview.score?.overall ?? 0,
      }));
  }, [completedInterviews]);

  const recentInterviews = interviews.slice(0, 4);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!isSignedIn || !user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
        <PageHeader
          title={`Good morning, ${user.firstName || user.username || "there"}.`}
          subtitle="Ready for your next interview?"
          action={
            <Button
              className="flex items-center justify-center gap-2 px-3 py-5"
              
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

        {/* User */}
        <div className="mt-6 flex items-center gap-3">
          <img
            src={profileImage ? profileImage : user.imageUrl}
            alt={user.fullName || "User"}
            className="h-10 w-10 rounded-full object-cover"
          />

          <div>
            <p className="font-medium">
              {user.fullName || user.username}
            </p>

            <p className="text-sm text-muted-foreground">
              {user.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          <div className="bg-card px-5 py-5">
            <p className="label-eyebrow">
              Overall Score
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {averageOverallScore ?? "—"}
            </p>

            <p className="mt-1 font-mono text-[11px] text-primary">
              {averageOverallScore !== null
                ? "Average score"
                : "No completed interviews"}
            </p>
          </div>

          <div className="bg-card px-5 py-5">
            <p className="label-eyebrow">
              Technical Score
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {averageTechnicalScore ?? "—"}
            </p>

            <p className="mt-1 font-mono text-[11px] text-primary">
              {averageTechnicalScore !== null
                ? "Average score"
                : "No completed interviews"}
            </p>
          </div>

          <div className="bg-card px-5 py-5">
            <p className="label-eyebrow">
              Interviews Completed
            </p>

            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {completedInterviews.length}
            </p>

            <p className="mt-1 font-mono text-[11px] text-primary">
              {interviews.length} total
            </p>
          </div>
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
            <ScoreLine data={performanceData} />
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
            {loading ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                Loading interviews...
              </div>
            ) : error ? (
              <div className="px-5 py-12 text-center text-sm text-destructive">
                {error}
              </div>
            ) : recentInterviews.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                No interviews yet.
              </div>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Role", "Date", "Score", "Status", ""].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-5 py-3 font-mono text-[10px] font-normal tracking-widest text-muted-foreground uppercase"
                        >
                          {heading}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>

                <tbody>
                  {recentInterviews.map((interview) => (
                    <tr
                      key={interview._id}
                      className="border-b border-border last:border-0 transition-colors hover:bg-background"
                    >
                      <td className="px-5 py-3.5 font-medium">
                        {interview.candidateProfile?.name ||
                          "Interview"}
                      </td>

                      <td className="px-5 py-3.5 text-muted-foreground">
                        {formatDate(interview.createdAt)}
                      </td>

                      <td className="px-5 py-3.5 font-mono">
                        {interview.score?.overall ?? "—"}
                      </td>

                      <td className="px-5 py-3.5 text-muted-foreground">
                        {interview.status.replace("-", " ")}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={
                            interview.status === "completed"
                              ? `/result/${interview._id}`
                              : `/interview/${interview._id}`
                          }
                          className="text-primary hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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