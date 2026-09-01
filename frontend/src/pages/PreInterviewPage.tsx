import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import {
  GitBranch,
  Upload,
  FileText,
  ArrowRight,
  Sparkles,
  Loader2
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

const PreInterviewPage = () => {
  const navigate = useNavigate();

  const [githubUsername, setGithubUsername] = useState("");
  const [resume, setResume] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!githubUsername || !resume) {
      setError("Please enter your GitHub username and upload your resume.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const formData = new FormData();

      formData.append("githubUsername", githubUsername);
      formData.append("resume", resume);

      const response = await axios.post(
        "http://localhost:3000/pre-interview",
        formData
      );

      console.log("Backend response:", response.data);

      const { interviewId } = response.data;

      if(!interviewId) {
        setError("Interview could not be created.");
      }

      navigate(`/interview/${interviewId}`);

    } catch (error) {
      console.error(error);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12 relative overflow-hidden">

      <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />

      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />

      <div className="relative w-full max-w-2xl">

        {/* Header */}
        <div className="text-center mb-8">

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300 mb-5">
            <Sparkles className="w-4 h-4 text-violet-400" />
            AI-powered technical interview
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Let's prepare your
            <span className="text-violet-400"> interview</span>
          </h1>

          <p className="text-slate-400 mt-4 max-w-lg mx-auto">
            Share your GitHub profile and resume. We'll analyze your
            experience and create a personalized AI interview.
          </p>

        </div>

        {/* Card */}
        <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl shadow-2xl p-5">

          <CardContent>

            <form onSubmit={handleSubmit} className="space-y-7">

              {/* GitHub */}
              <div className="space-y-3">

                <label className="text-sm font-medium text-slate-200">
                  GitHub username
                </label>

                <div className="relative pt-3">

                  <GitBranch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />

                  <Input
                    value={githubUsername}
                    onChange={(e) =>
                      setGithubUsername(e.target.value)
                    }
                    placeholder="e.g. codemanbeast"
                    className="h-12 pl-11 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-violet-500"
                  />

                </div>

                <p className="text-xs text-slate-500">
                  We'll analyze your public repositories and projects.
                </p>

              </div>

              {/* Resume */}
              <div className="space-y-3">

                <label className="text-sm font-medium text-slate-200">
                  Resume
                </label>

                <label
                  htmlFor="resume"
                  className="group flex flex-col items-center justify-center w-full h-40 rounded-xl border border-dashed border-white/15 bg-white/[0.02] hover:bg-white/[0.05] hover:border-violet-500/50 transition cursor-pointer"
                >

                  {resume ? (
                    <>
                      <FileText className="w-8 h-8 text-violet-400 mb-3" />

                      <p className="text-sm font-medium text-white">
                        {resume.name}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        {(resume.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-11 h-11 rounded-full bg-violet-500/10 flex items-center justify-center mb-3">
                        <Upload className="w-5 h-5 text-violet-400" />
                      </div>

                      <p className="text-sm font-medium text-slate-200">
                        Upload your resume
                      </p>

                      <p className="text-xs text-slate-500 mt-1">
                        PDF, DOC or DOCX
                      </p>
                    </>
                  )}

                  <input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];

                      if (file) {
                        setResume(file);
                      }
                    }}
                  />

                </label>

              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-400">
                  {error}
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading || !githubUsername || !resume}
                className="w-full h-12 bg-violet-600 hover:bg-violet-500 text-white font-medium"
              >
                {loading ? (
                  <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Preparing your interview...
                  </>
                ) : (
                  <>
                    Start interview preparation
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>

            </form>

          </CardContent>

        </Card>

        <p className="text-center text-xs text-slate-600 mt-6">
          Your information is only used to personalize your interview.
        </p>

      </div>

    </main>
  );
};

export default PreInterviewPage;