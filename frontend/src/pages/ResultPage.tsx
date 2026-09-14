import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  Trophy,
  TrendingUp,
  MessageSquare,
  Zap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Download,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const ResultPage = () => {
  const navigate = useNavigate();
  const { interviewId } = useParams();

  const [score, setScore] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        if (!interviewId) {
          setError("Interview ID is missing");
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `http://localhost:3000/interview/${interviewId}`
        );

        const {
          score: evaluation,
          candidateProfile: profile,
        } = response.data;

        if (!evaluation) {
          setError("Interview evaluation not found");
          setLoading(false);
          return;
        }

        setScore(evaluation);
        setCandidateProfile(profile);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch results:", err);
        setError("Failed to load interview results");
        setLoading(false);
      }
    };

    fetchResults();
  }, [interviewId]);

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return "bg-green-500/10";
    if (score >= 60) return "bg-yellow-500/10";
    return "bg-red-500/10";
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />

          <p className="text-muted-foreground">
            Loading your results...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />

          <p className="text-destructive mb-4">
            {error}
          </p>

          <Button
            onClick={() => navigate("/")}
          >
            Go Back Home
          </Button>
        </div>
      </main>
    );
  }

  if (!score) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            No results found
          </p>

          <Button
            onClick={() => navigate("/")}
          >
            Go Back Home
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">

      <div className="mx-auto w-full max-w-[1000px] px-6 py-10 lg:px-10">

        {/* Header */}

        <div className="border-b border-border pb-8">

          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="-ml-3 mb-6 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Interview Complete
              </p>

              <h1 className="mt-3 text-[28px] font-semibold tracking-tight">
                Interview Report
              </h1>

              <p className="mt-1.5 text-sm text-muted-foreground">
                {candidateProfile?.name &&
                  `Great job, ${candidateProfile.name}!`}
              </p>
            </div>

            <p className="font-mono text-[11px] text-muted-foreground">
              Interview completed today
            </p>

          </div>
        </div>

        {/* Overall Score */}

        <section className="grid gap-10 border-b border-border py-10 sm:grid-cols-[auto_1fr] sm:gap-16">

          <div>

            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Overall
            </p>

            <p
              className={`mt-2 text-[64px] leading-none font-semibold tracking-tight ${getScoreColor(
                score.overall
              )}`}
            >
              {Math.round(score.overall)}

              <span className="text-2xl font-normal text-muted-foreground">
                {" "}
                / 100
              </span>
            </p>

            <p className="mt-3 text-[13px] text-muted-foreground">
              {score.overall >= 80
                ? "Excellent performance!"
                : score.overall >= 60
                ? "Good effort, keep improving!"
                : "Areas for improvement identified"}
            </p>

          </div>

          <div className="grid content-center gap-5">

            {/* Technical */}

            <div>
              <div className="mb-2 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <TrendingUp className="h-4 w-4 text-primary" />

                  <span className="text-[13px]">
                    Technical
                  </span>

                </div>

                <span
                  className={`font-mono text-[12px] ${getScoreColor(
                    score.technical
                  )}`}
                >
                  {Math.round(score.technical)}
                </span>

              </div>

              <div
                className={`h-2 w-full overflow-hidden rounded-full ${getScoreBgColor(
                  score.technical
                )}`}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{
                    width: `${Math.min(score.technical, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Problem Solving */}

            <div>
              <div className="mb-2 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <Zap className="h-4 w-4 text-primary" />

                  <span className="text-[13px]">
                    Problem Solving
                  </span>

                </div>

                <span
                  className={`font-mono text-[12px] ${getScoreColor(
                    score.problemSolving
                  )}`}
                >
                  {Math.round(score.problemSolving)}
                </span>

              </div>

              <div
                className={`h-2 w-full overflow-hidden rounded-full ${getScoreBgColor(
                  score.problemSolving
                )}`}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{
                    width: `${Math.min(score.problemSolving, 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Communication */}

            <div>
              <div className="mb-2 flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <MessageSquare className="h-4 w-4 text-primary" />

                  <span className="text-[13px]">
                    Communication
                  </span>

                </div>

                <span
                  className={`font-mono text-[12px] ${getScoreColor(
                    score.communication
                  )}`}
                >
                  {Math.round(score.communication)}
                </span>

              </div>

              <div
                className={`h-2 w-full overflow-hidden rounded-full ${getScoreBgColor(
                  score.communication
                )}`}
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{
                    width: `${Math.min(score.communication, 100)}%`,
                  }}
                />
              </div>
            </div>

          </div>

        </section>

        {/* Strengths / Weaknesses */}

        <section className="grid gap-10 border-b border-border py-10 sm:grid-cols-2">

          {/* Strengths */}

          {score.strengths &&
            score.strengths.length > 0 && (
              <div>

                <div className="flex items-center gap-2">

                  <CheckCircle2 className="h-4 w-4 text-green-500" />

                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Strengths
                  </p>

                </div>

                <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-muted-foreground">

                  {score.strengths.map(
                    (strength, index) => (
                      <li
                        key={index}
                        className="border-l-2 border-primary pl-3"
                      >
                        {strength}
                      </li>
                    )
                  )}

                </ul>

              </div>
            )}

          {/* Weaknesses */}

          {score.weaknesses &&
            score.weaknesses.length > 0 && (
              <div>

                <div className="flex items-center gap-2">

                  <AlertCircle className="h-4 w-4 text-yellow-500" />

                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Areas to Improve
                  </p>

                </div>

                <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-muted-foreground">

                  {score.weaknesses.map(
                    (weakness, index) => (
                      <li
                        key={index}
                        className="border-l-2 border-destructive pl-3"
                      >
                        {weakness}
                      </li>
                    )
                  )}

                </ul>

              </div>
            )}

        </section>

        {/* Detailed Feedback */}

        {score.feedback && (
          <section className="border-b border-border py-10">

            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              AI Feedback
            </p>

            <p className="mt-4 max-w-3xl text-[15px] leading-relaxed">
              {score.feedback}
            </p>

          </section>
        )}

        {/* Action Buttons */}

        <div className="flex flex-col gap-3 border-t border-border pt-8 sm:flex-row">

          <Button
            onClick={() => navigate("/")}
            className="sm:w-auto"
          >
            Take Another Interview
          </Button>

          <Button
            variant="outline"
            className="sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Results
          </Button>

        </div>

        {/* Footer */}

        <p className="mt-6 text-center font-mono text-[11px] text-muted-foreground">
          Interview completed on{" "}
          {new Date().toLocaleDateString()}
        </p>

      </div>
    </main>
  );
};

export default ResultPage;