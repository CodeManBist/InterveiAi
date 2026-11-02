import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  TrendingUp,
  MessageSquare,
  Zap,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";

import {
  LoadingSpinner,
  LoadingState,
} from "@/components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/useApi";

interface EvaluationScore {
  overall: number;
  technical: number;
  problemSolving: number;
  communication: number;
  strengths?: string[];
  weaknesses?: string[];
  feedback?: string;
}

interface CandidateProfile {
  name?: string;
  [key: string]: unknown;
}

const ResultPage = () => {
  const api = useApi();
  const navigate = useNavigate();
  const { interviewId } = useParams();

  const [score, setScore] = useState<EvaluationScore | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const downloadResults = () => {
    if (!score) {
      return;
    }

    setDownloading(true);

    try {
      const escapeHtml = (value: string) =>
        value
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll('"', "&quot;")
          .replaceAll("'", "&#039;");

      const list = (items: string[] | undefined) =>
        items?.length
          ? `<ul>${items
              .map((item) => `<li>${escapeHtml(item)}</li>`)
              .join("")}</ul>`
          : "<p>None provided.</p>";

      const candidateName = candidateProfile?.name
        ? escapeHtml(candidateProfile.name)
        : "Candidate";
      const report = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Interview Report - ${candidateName}</title>
    <style>
      body { color: #202b25; font: 16px/1.6 Arial, sans-serif; margin: 0 auto; max-width: 760px; padding: 48px 24px; }
      h1 { margin-bottom: 4px; } h2 { border-bottom: 1px solid #d9ded8; margin-top: 32px; padding-bottom: 8px; }
      .muted { color: #66736b; } .score { font-size: 42px; font-weight: 700; }
      .grid { display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); }
      .metric { background: #f2f5f1; border-radius: 8px; padding: 14px; }
      .metric strong { display: block; font-size: 24px; } ul { padding-left: 24px; }
      @media print { body { padding: 0; } }
    </style>
  </head>
  <body>
    <p class="muted">Interview Report</p>
    <h1>${candidateName}</h1>
    <p class="muted">Interview completed on ${escapeHtml(
      new Date().toLocaleDateString(),
    )}</p>
    <p class="score">${Math.round(score.overall)} / 100</p>
    <div class="grid">
      <div class="metric">Technical<strong>${Math.round(score.technical)}</strong></div>
      <div class="metric">Problem solving<strong>${Math.round(score.problemSolving)}</strong></div>
      <div class="metric">Communication<strong>${Math.round(score.communication)}</strong></div>
      <div class="metric">Overall<strong>${Math.round(score.overall)}</strong></div>
    </div>
    ${
      score.feedback
        ? `<h2>AI Feedback</h2><p>${escapeHtml(score.feedback)}</p>`
        : ""
    }
    <h2>Strengths</h2>
    ${list(score.strengths)}
    <h2>Areas for Improvement</h2>
    ${list(score.weaknesses)}
  </body>
</html>`;

      const blob = new Blob([report], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `interview-report-${interviewId || "results"}.html`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    const fetchResults = async () => {
      try {
        if (!interviewId) {
          setError("Interview ID is missing");
          setLoading(false);
          return;
        }

        const response = await api.get(
          `/interview/${interviewId}`
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-500/10";
    if (score >= 60) return "bg-yellow-500/10";
    return "bg-red-500/10";
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
        <LoadingState label="Loading your results" />
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
                    (strength: string, index: number) => (
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
                    (weakness: string, index: number) => (
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
            onClick={downloadResults}
            disabled={downloading}
            className="sm:w-auto"
          >
            {downloading ? (
              <LoadingSpinner className="mr-2" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {downloading ? "Preparing report" : "Download Results"}
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