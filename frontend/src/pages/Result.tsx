import { useState, useEffect } from "react";
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

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface EvaluationScore {
  overall: number;
  technical: number;
  communication: number;
  problemSolving: number;
  feedback: string;
  strengths: string[];
  weaknesses: string[];
}

interface CandidateProfile {
  name?: string;
  skills?: string[];
  github?: string;
}

const Result = () => {
  const navigate = useNavigate();
  const { interviewId } = useParams<{ interviewId: string }>();

  const [score, setScore] = useState<EvaluationScore | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
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

        const { score: evaluation, candidateProfile: profile } = response.data;

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
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-500/10";
    if (score >= 60) return "bg-yellow-500/10";
    return "bg-red-500/10";
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-400" />
          <p className="text-slate-300">Loading your results...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <Button
            onClick={() => navigate("/")}
            className="bg-violet-600 hover:bg-violet-500"
          >
            Go Back Home
          </Button>
        </div>
      </main>
    );
  }

  if (!score) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-slate-300 mb-4">No results found</p>
          <Button
            onClick={() => navigate("/")}
            className="bg-violet-600 hover:bg-violet-500"
          >
            Go Back Home
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-12 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />

      <div className="relative w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate("/")}
            variant="ghost"
            className="text-slate-400mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <div className="text-center">
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
              Interview <span className="text-violet-400">Complete</span>
            </h1>
            <p className="text-slate-400">
              {candidateProfile?.name && `Great job, ${candidateProfile.name}!`}
            </p>
          </div>
        </div>

        {/* Overall Score */}
        <Card className="bg-gradient-to-br from-violet-500/20 to-blue-500/20 border-violet-500/30 backdrop-blur-xl shadow-2xl mb-6">
          <CardContent className="p-8">
            <div className="text-center">
              <p className="text-slate-300 text-sm font-medium mb-2">Overall Score</p>
              <div className={`text-6xl font-bold mb-2 ${getScoreColor(score.overall)}`}>
                {Math.round(score.overall)}
              </div>
              <div className="w-full bg-slate-700 rounded-full h-3 mb-4 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-500 to-blue-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(score.overall, 100)}%` }}
                />
              </div>
              <p className="text-slate-400 text-sm">
                {score.overall >= 80
                  ? "Excellent performance!"
                  : score.overall >= 60
                  ? "Good effort, keep improving!"
                  : "Areas for improvement identified"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Score Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Technical */}
          <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-slate-200">Technical</h3>
              </div>
              <div className={`text-4xl font-bold mb-3 ${getScoreColor(score.technical)}`}>
                {Math.round(score.technical)}
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${getScoreBgColor(score.technical)}`}>
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${Math.min(score.technical, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Knowledge & depth
              </p>
            </CardContent>
          </Card>

          {/* Communication */}
          <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-slate-200">Communication</h3>
              </div>
              <div className={`text-4xl font-bold mb-3 ${getScoreColor(score.communication)}`}>
                {Math.round(score.communication)}
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${getScoreBgColor(score.communication)}`}>
                <div
                  className="bg-cyan-500 h-full rounded-full"
                  style={{ width: `${Math.min(score.communication, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Clarity & confidence
              </p>
            </CardContent>
          </Card>

          {/* Problem Solving */}
          <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-yellow-400" />
                <h3 className="font-semibold text-slate-200">Problem Solving</h3>
              </div>
              <div className={`text-4xl font-bold mb-3 ${getScoreColor(score.problemSolving)}`}>
                {Math.round(score.problemSolving)}
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${getScoreBgColor(score.problemSolving)}`}>
                <div
                  className="bg-yellow-500 h-full rounded-full"
                  style={{ width: `${Math.min(score.problemSolving, 100)}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Reasoning & approach
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Strengths */}
        {score.strengths && score.strengths.length > 0 && (
          <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-slate-200">Strengths</h3>
              </div>
              <ul className="space-y-2">
                {score.strengths.map((strength, index) => (
                  <li key={index} className="flex gap-3 text-slate-300">
                    <span className="text-green-400 mt-0.5">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Weaknesses */}
        {score.weaknesses && score.weaknesses.length > 0 && (
          <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl mb-6">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <h3 className="text-lg font-semibold text-slate-200">Areas for Improvement</h3>
              </div>
              <ul className="space-y-2">
                {score.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex gap-3 text-slate-300">
                    <span className="text-yellow-400 mt-0.5">→</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Detailed Feedback */}
        {score.feedback && (
          <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">Detailed Feedback</h3>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                {score.feedback}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={() => navigate("/")}
            className="flex-1 h-12 bg-violet-600 hover:bg-violet-500 text-white font-medium"
          >
            Take Another Interview
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-12 border-white/10 text-black "
          >
            <Download className="w-4 h-4 mr-2" />
            Download Results
          </Button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Interview completed on {new Date().toLocaleDateString()}
        </p>
      </div>
    </main>
  );
};

export default Result;
