import { useRef, useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { Mic, MicOff, LogOut, Loader2, Volume2, Brain, MessageCircle } from "lucide-react";

import { connectToGemini } from "../utils/geminiWebSocket";
import { AudioStreamer, AudioPlayer } from "../utils/mediaUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CandidateProfile {
  name?: string;
  skills?: string[];
  github?: string;
}

const Interview = () => {
  const navigate = useNavigate();
  const { interviewId } = useParams<{ interviewId: string }>();

  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [interviewStarted, setInterviewStarted] = useState(false);

  // Poll for question count updates
  useEffect(() => {
    if (!interviewStarted || !interviewId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/interview/${interviewId}`
        );
        setQuestionCount(response.data.questionCount || 0);
      } catch (err) {
        console.error("Failed to fetch question count:", err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [interviewStarted, interviewId]);

  const geminiRef = useRef<ReturnType<typeof connectToGemini> | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    const initInterview = async () => {
      try {
        if (!interviewId) {
          setError("Interview ID is missing");
          return;
        }

        const interviewResponse = await axios.get(
          `http://localhost:3000/interview/${interviewId}`
        );

        const { candidateProfile: profile } = interviewResponse.data;
        setCandidateProfile(profile);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load interview:", err);
        setError("Failed to load interview data");
        setLoading(false);
      }
    };

    initInterview();
  }, [interviewId]);

  const startInterview = async () => {
    try {
      setLoading(true);
      setError("");

      if (!interviewId) {
        setError("Interview ID is missing");
        return;
      }

      const interviewResponse = await axios.get(
        `http://localhost:3000/interview/${interviewId}`
      );

      const { candidateProfile, githubRepositories } = interviewResponse.data;

      console.log("Candidate profile:", candidateProfile);
      console.log("GitHub:", githubRepositories);

      await axios.patch(`http://localhost:3000/interview/${interviewId}/start`);

      const tokenResponse = await axios.get(
        "http://localhost:3000/live-token"
      );

      if (!tokenResponse.data?.token) {
        console.error("No ephemeral token received");
        setError("Failed to get ephemeral token");
        return;
      }

      const ephemeralToken = tokenResponse.data.token;

      const gemini = connectToGemini(
        ephemeralToken,
        candidateProfile,
        githubRepositories
      );

      geminiRef.current = gemini;

      const audioPlayer = new AudioPlayer();
      audioPlayerRef.current = audioPlayer;

      await audioPlayer.init();

      console.log("🔊 Audio player ready");

      gemini.websocket.onmessage = async (event) => {
        try {
          const text = await event.data.text();
          const response = JSON.parse(text);

          console.log("Gemini response:", response);

          if (response.setupComplete) {
            console.log("Gemini setup complete");
            setConnected(true);
            setInterviewStarted(true);

            const audioStreamer = new AudioStreamer(gemini);
            audioStreamerRef.current = audioStreamer;

            await audioStreamer.start();
            setMicActive(true);

            console.log("🎤 Microphone streaming started");

            gemini.sendCandidateContext();
            console.log("📄 Candidate context sent");
          }

          const parts = response.serverContent?.modelTurn?.parts;

          if (parts) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                await audioPlayerRef.current?.play(
                  part.inlineData.data
                );
              }
            }
          }

          if (response.serverContent?.interrupted) {
            console.log("Gemini interrupted");
            audioPlayerRef.current?.interrupt();
          }
        } catch (error) {
          console.error("Error processing Gemini message:", error);
        }
      };

      gemini.websocket.onerror = (error) => {
        console.error("Gemini WebSocket error:", error);
        setError("WebSocket connection error");
      };

      gemini.websocket.onclose = (event) => {
        console.log("Gemini WebSocket closed");
        console.log("Code:", event.code);
        console.log("Reason:", event.reason);

        setConnected(false);
        setMicActive(false);
      };

      setLoading(false);
    } catch (error) {
      console.error("Failed to start interview:", error);
      setError("Failed to start interview. Please try again.");
      setLoading(false);
    }
  };

  const stopInterview = async () => {
    try {
      setLoading(true);

      audioStreamerRef.current?.stop();
      audioStreamerRef.current = null;

      audioPlayerRef.current?.destroy();
      audioPlayerRef.current = null;

      geminiRef.current?.websocket.close();
      geminiRef.current = null;

      setConnected(false);
      setMicActive(false);

      console.log("Interview stopped");

      // Complete the interview
      const response = await axios.post(
        `http://localhost:3000/interview/${interviewId}/complete`
      );

      console.log("Interview completed:", response.data);

      // Navigate to results
      navigate(`/result/${interviewId}`);
    } catch (error) {
      console.error("Error stopping interview:", error);
      setError("Error completing interview");
      setLoading(false);
    }
  };

  if (loading && !interviewStarted) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-400" />
          <p className="text-slate-300">Loading interview...</p>
        </div>
      </main>
    );
  }

  if (error && !interviewStarted) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button
            onClick={() => navigate("/")}
            className="bg-violet-600 hover:bg-violet-500"
          >
            Go Back
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />

      <div className="relative w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">
            <span className="text-violet-400">Live Interview</span>
          </h1>
          <p className="text-slate-400">
            {candidateProfile?.name && `Welcome, ${candidateProfile.name}`}
          </p>
        </div>

        {/* Main card with interview info and controls */}
        <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-6">
            <div className="space-y-6">
              {/* Candidate Info */}
              {candidateProfile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10">
                    <p className="text-sm text-slate-400 mb-1">Candidate</p>
                    <p className="text-lg font-semibold text-white">
                      {candidateProfile.name || "Unknown"}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10">
                    <p className="text-sm text-slate-400 mb-1">GitHub</p>
                    <p className="text-lg font-semibold text-violet-400">
                      @{candidateProfile.github || "N/A"}
                    </p>
                  </div>
                </div>
              )}

              {/* Status Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* Connection Status */}
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    {connected ? (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <p className="text-sm font-medium text-green-400">Connected</p>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-slate-500 rounded-full" />
                        <p className="text-sm font-medium text-slate-400">
                          {interviewStarted ? "Connecting..." : "Not Connected"}
                        </p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Gemini WebSocket</p>
                </div>

                {/* Microphone Status */}
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    {micActive ? (
                      <>
                        <Mic className="w-4 h-4 text-red-400 animate-pulse" />
                        <p className="text-sm font-medium text-red-400">Recording</p>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-4 h-4 text-slate-500" />
                        <p className="text-sm font-medium text-slate-400">
                          {interviewStarted ? "Processing..." : "Inactive"}
                        </p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">Microphone Input</p>
                </div>
              </div>

              {/* Question Counter */}
              {interviewStarted && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-violet-500/20 to-blue-500/20 border border-violet-500/30">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-violet-400" />
                    <div>
                      <p className="text-sm text-slate-300">Interview Progress</p>
                      <p className="text-2xl font-bold text-violet-400">
                        {questionCount} / 10 Questions
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Audio indicator when connected */}
              {connected && micActive && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <MessageCircle className="w-4 h-4 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-300">Listening to your response...</p>
                </div>
              )}

              {/* Control Buttons */}
              <div className="flex gap-3 pt-4">
                {!interviewStarted ? (
                  <Button
                    onClick={startInterview}
                    disabled={loading}
                    className="flex-1 h-12 bg-violet-600 hover:bg-violet-500 text-white font-medium flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-5 h-5" />
                        Start Interview
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={stopInterview}
                      disabled={loading || !connected}
                      className="flex-1 h-12 bg-red-600 hover:bg-red-500 text-white font-medium flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <LogOut className="w-5 h-5" />
                          End Interview
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>

              <p className="text-xs text-slate-500 text-center pt-4">
                Make sure your microphone is enabled and speaker volume is at a comfortable level.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Interview;