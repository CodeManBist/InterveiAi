import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { Upload, FileText, Loader2 } from "lucide-react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/lib/useApi";

function NewInterviewPage() {
  const api = useApi();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [github, setGithub] = useState("");
  const [resume, setResume] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleResumeChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setResume(file);
    setError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!github.trim() || !resume) {
      setError(
        "Please enter your GitHub username and upload your resume.",
      );
      return;
    }

    try {
      setLoading(true);
      setError("");

      // -----------------------------------------------
      // Get Clerk authentication token
      // -----------------------------------------------

      const token = await getToken();

      if (!token) {
        setError("Authentication token not available.");
        return;
      }

      // -----------------------------------------------
      // Create form data
      // -----------------------------------------------

      const formData = new FormData();

      formData.append("githubUsername", github.trim());
      formData.append("resume", resume);

      // -----------------------------------------------
      // Create interview
      // -----------------------------------------------

      const response = await api.post("/pre-interview", formData);

      console.log(
        "Backend response:",
        response.data,
      );

      const { interviewId } = response.data;

      if (!interviewId) {
        setError("Interview could not be created.");
        return;
      }

      navigate(`/interview/${interviewId}`);
    } catch (error) {
      console.error(
        "Failed to create interview:",
        error,
      );

      if (axios.isAxiosError(error)) {
        setError(
          error.response?.data?.message ||
            "Something went wrong. Please try again.",
        );
      } else {
        setError(
          "Something went wrong. Please try again.",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1200px] px-6 py-10 lg:px-10">
        <PageHeader
          title="New Interview"
          subtitle="Share your GitHub profile and resume to create a personalized interview."
        />

        <form onSubmit={handleSubmit}>
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* Main Form */}
            <div className="space-y-8">
              {/* GitHub */}
              <div className="space-y-2">
                <Label htmlFor="github">
                  GitHub Username
                </Label>

                <Input
                  id="github"
                  value={github}
                  onChange={(event) =>
                    setGithub(event.target.value)
                  }
                  placeholder="e.g. codemanbeast"
                  disabled={loading}
                  className="w-full"
                />

                <p className="font-mono text-[11px] text-muted-foreground">
                  We'll analyze your public repositories and
                  projects.
                </p>
              </div>

              {/* Resume */}
              <div className="space-y-3">
                <Label htmlFor="resume">
                  Resume
                </Label>

                <label
                  htmlFor="resume"
                  className="flex cursor-pointer items-center gap-4 rounded-lg border border-dashed border-border bg-card px-5 py-6 transition-colors hover:border-foreground/25"
                >
                  {resume ? (
                    <>
                      <FileText
                        className="h-5 w-5 shrink-0 text-primary"
                        strokeWidth={1.6}
                      />

                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium">
                          {resume.name}
                        </p>

                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {(
                            resume.size /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          MB
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload
                        className="h-5 w-5 shrink-0 text-primary"
                        strokeWidth={1.6}
                      />

                      <div>
                        <p className="text-[13px] font-medium">
                          Upload your resume
                        </p>

                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          PDF or DOCX, up to 5 MB
                        </p>
                      </div>
                    </>
                  )}

                  <input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    disabled={loading}
                    onChange={handleResumeChange}
                  />
                </label>
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            {/* Interview Summary */}
            <aside className="h-fit rounded-xl border border-border bg-card p-6 lg:sticky lg:top-10">
              <p className="label-eyebrow">
                Interview Preparation
              </p>

              <dl className="mt-5 space-y-3 text-[13px]">
                <div className="flex justify-between gap-6 border-b border-border pb-3">
                  <dt className="text-muted-foreground">
                    GitHub
                  </dt>

                  <dd className="max-w-[180px] truncate text-right font-medium">
                    {github || "Not provided"}
                  </dd>
                </div>

                <div className="flex justify-between gap-6 border-b border-border pb-3">
                  <dt className="text-muted-foreground">
                    Resume
                  </dt>

                  <dd className="max-w-[180px] truncate text-right font-medium">
                    {resume
                      ? resume.name
                      : "Not uploaded"}
                  </dd>
                </div>

                <div className="flex justify-between gap-6 border-b border-border pb-3">
                  <dt className="text-muted-foreground">
                    Analysis
                  </dt>

                  <dd className="text-right font-medium">
                    AI Powered
                  </dd>
                </div>

                <div className="flex justify-between gap-6">
                  <dt className="text-muted-foreground">
                    Mode
                  </dt>

                  <dd className="text-right font-medium">
                    Voice
                  </dd>
                </div>
              </dl>

              <Button
                type="submit"
                disabled={
                  loading ||
                  !github.trim() ||
                  !resume
                }
                className="mt-6 w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    Start Interview
                    <Upload className="h-4 w-4" />
                  </>
                )}
              </Button>
            </aside>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

export default NewInterviewPage;