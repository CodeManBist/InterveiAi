import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Volume2,
} from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { Waveform } from "@/components/landing/ScreenFrame";
import { Button } from "@/components/ui/button";

import { connectToGemini } from "../utils/geminiWebSocket";
import {
  AudioStreamer,
  AudioPlayer,
} from "../utils/mediaUtils";

import { cn } from "@/lib/utils";
import { useApi } from "@/lib/useApi";

interface CandidateProfile {
  name?: string;
  summary?: string;
  github?: string;
  skills?: string[];
  technologies?: string[];
  experience?: unknown[];
  projects?: unknown[];
  education?: unknown[];
  certifications?: string[];
}

const MAX_QUESTIONS = 10;

const InterviewPage = () => {
  const api = useApi();
  const navigate = useNavigate();

  const { interviewId } =
    useParams<{ interviewId: string }>();

  // --------------------------------
  // State
  // --------------------------------

  const [connected, setConnected] = useState(false);
  const [micActive, setMicActive] = useState(false);

  const [candidateProfile, setCandidateProfile] =
    useState<CandidateProfile | null>(null);

  const [questionCount, setQuestionCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [interviewStarted, setInterviewStarted] =
    useState(false);

  const [completing, setCompleting] =
    useState(false);

  // --------------------------------
  // Live transcript UI
  // --------------------------------

  const [currentQuestion, setCurrentQuestion] =
    useState("");

  const [userTranscript, setUserTranscript] =
    useState("");

  const [lastAnswer, setLastAnswer] =
    useState("");

  const [aiSpeaking, setAiSpeaking] =
    useState(false);

  const [userSpeaking, setUserSpeaking] =
    useState(false);

  // --------------------------------
  // Timer
  // --------------------------------

  const [seconds, setSeconds] = useState(0);

  // --------------------------------
  // Refs
  // --------------------------------

  const questionCountRef = useRef(0);

  const messageSaveChainRef =
    useRef<Promise<unknown>>(Promise.resolve());

  const geminiRef =
    useRef<ReturnType<typeof connectToGemini> | null>(
      null,
    );

  const audioStreamerRef =
    useRef<AudioStreamer | null>(null);

  const audioPlayerRef =
    useRef<AudioPlayer | null>(null);

  const completionStartedRef =
    useRef(false);

  // --------------------------------
  // Transcript buffers
  // --------------------------------

  const inputTranscriptRef = useRef("");
  const outputTranscriptRef = useRef("");

  // First Gemini response is greeting
  const firstAiResponseRef = useRef(true);

  // Only accept answers when Gemini
  // has asked a question.
  const waitingForAnswerRef = useRef(false);

  // --------------------------------
  // Timer
  // --------------------------------

  useEffect(() => {
    if (!interviewStarted) {
      return;
    }

    const timer = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [interviewStarted]);

  const minutes = String(
    Math.floor(seconds / 60),
  ).padStart(2, "0");

  const remainingSeconds = String(
    seconds % 60,
  ).padStart(2, "0");

  // --------------------------------
  // Load interview
  // --------------------------------

  useEffect(() => {
    const loadInterview = async () => {
      try {
        if (!interviewId) {
          setError("Interview ID is missing.");
          setLoading(false);
          return;
        }

        const response = await api.get(
          `/interview/${interviewId}`,
        );

        const data = response.data;

        console.log("📄 Interview data:", data);

        setCandidateProfile(
          data.candidateProfile,
        );

        const restoredQuestionCount =
          data.questionCount || 0;

        questionCountRef.current =
          restoredQuestionCount;

        setQuestionCount(
          restoredQuestionCount,
        );

        if (data.status === "completed") {
          navigate(
            `/result/${interviewId}`,
            { replace: true },
          );

          return;
        }

        setLoading(false);
      } catch (error) {
        console.error(
          "Failed to load interview:",
          error,
        );

        setError(
          "Failed to load interview data.",
        );

        setLoading(false);
      }
    };

    loadInterview();
  }, [interviewId, navigate]);

  // --------------------------------
  // Save message
  // --------------------------------

  const saveMessage = async (
    role: "ai" | "user",
    type:
      | "question"
      | "answer"
      | "greeting",
    content: string,
  ) => {
    if (!interviewId) {
      return null;
    }

    const cleanContent = content.trim();

    if (!cleanContent) {
      return null;
    }

    const saveOperation =
      messageSaveChainRef.current.then(
        async () => {
          try {
            console.log(
              `💾 Saving ${role}/${type}:`,
              cleanContent,
            );

            const response =
              await api.post(
                `/interview/${interviewId}/messages`,
                {
                  role,
                  type,
                  content: cleanContent,
                },
              );

            console.log(
              "✅ Message saved:",
              response.data,
            );

            if (
              typeof response.data
                .questionCount === "number"
            ) {
              questionCountRef.current =
                response.data.questionCount;

              setQuestionCount(
                response.data.questionCount,
              );
            }

            return response.data;
          } catch (error) {
            console.error(
              `❌ Failed to save ${role}/${type}:`,
              error,
            );

            return null;
          }
        },
      );

    messageSaveChainRef.current =
      saveOperation.catch(() => undefined);

    return saveOperation;
  };

  // --------------------------------
  // Finish interview
  // --------------------------------

  const finishAndNavigate = async () => {
    if (
      completionStartedRef.current ||
      !interviewId
    ) {
      return;
    }

    completionStartedRef.current = true;

    setCompleting(true);

    try {
      await messageSaveChainRef.current;

      console.log(
        "🏁 Finishing interview...",
      );

      // Stop microphone
      audioStreamerRef.current?.stop();
      audioStreamerRef.current = null;

      // Stop audio player
      audioPlayerRef.current?.destroy();
      audioPlayerRef.current = null;

      // Close Gemini WebSocket
      const websocket =
        geminiRef.current?.websocket;

      if (
        websocket &&
        websocket.readyState ===
          WebSocket.OPEN
      ) {
        websocket.close();
      }

      geminiRef.current = null;

      setConnected(false);
      setMicActive(false);

      // Ask backend for latest status
      const response =
        await api.get(
          `/interview/${interviewId}`,
        );

      console.log(
        "Final interview status:",
        response.data.status,
      );

      // If backend has not completed it,
      // manually complete it.
      if (
        response.data.status !==
        "completed"
      ) {
        await api.post(
          `/interview/${interviewId}/complete`,
        );
      }

      navigate(
        `/result/${interviewId}`,
        { replace: true },
      );
    } catch (error) {
      console.error(
        "Failed to complete interview:",
        error,
      );

      completionStartedRef.current =
        false;

      setCompleting(false);

      setError(
        "Failed to complete interview.",
      );
    }
  };

  // --------------------------------
  // Gemini message handler
  // --------------------------------

  const handleGeminiMessage = async (
    event: MessageEvent,
  ) => {
    try {
      const text =
        typeof event.data === "string"
          ? event.data
          : await event.data.text();

      const response: {
        serverContent?: {
          inputTranscription?: {
            text?: string;
          };
          inputAudioTranscription?: {
            text?: string;
          };
          outputTranscription?: {
            text?: string;
          };
          outputAudioTranscription?: {
            text?: string;
          };
          modelTurn?: {
            parts?: Array<{
              inlineData?: {
                data?: string;
              };
            }>;
          };
          interrupted?: boolean;
          turnComplete?: boolean;
          generationComplete?: boolean;
        };
      } = JSON.parse(text);

      console.log(
        "📩 Gemini response:",
        response,
      );

      const serverContent =
        response.serverContent;

      if (!serverContent) {
        return;
      }

      const inputTranscription =
        serverContent.inputTranscription ??
        serverContent.inputAudioTranscription;

      const outputTranscription =
        serverContent.outputTranscription ??
        serverContent.outputAudioTranscription;

      // =================================
      // 1. Gemini audio
      // =================================

      const parts =
        serverContent.modelTurn?.parts;

      if (parts) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            setAiSpeaking(true);

            await audioPlayerRef.current?.play(
              part.inlineData.data,
            );
          }
        }
      }

      // =================================
      // 2. USER TRANSCRIPTION
      // =================================

      const inputTranscript =
        inputTranscription?.text;

      if (
        inputTranscript &&
        inputTranscript.trim()
      ) {
        inputTranscriptRef.current +=
          inputTranscript;

        setUserTranscript(
          inputTranscriptRef.current,
        );

        setUserSpeaking(true);

        console.log(
          "👤 User transcript chunk:",
          inputTranscript,
        );
      }

      // =================================
      // 3. GEMINI TRANSCRIPTION
      // =================================

      const outputTranscript =
        outputTranscription?.text;

      if (
        outputTranscript &&
        outputTranscript.trim()
      ) {
        outputTranscriptRef.current +=
          outputTranscript;

        setCurrentQuestion(
          outputTranscriptRef.current,
        );

        setAiSpeaking(true);

        console.log(
          "🤖 Gemini transcript chunk:",
          outputTranscript,
        );
      }

      // =================================
      // 4. INPUT TRANSCRIPTION FINISHED
      // =================================

      // Gemini Live does not expose `finished` on inputTranscription.
      // Finalize the candidate answer when the current turn completes.
      if (serverContent.turnComplete) {
          const finalInput =
            inputTranscriptRef.current.trim();
        
          inputTranscriptRef.current = "";
        
          setUserSpeaking(false);
        
          if (finalInput) {
            console.log(
              "👤 FINAL USER ANSWER:",
              finalInput
            );
        
            setLastAnswer(finalInput);
            setUserTranscript("");
        
            if (waitingForAnswerRef.current) {
              waitingForAnswerRef.current = false;
        
              const savedAnswer =
                await saveMessage(
                  "user",
                  "answer",
                  finalInput
                );
        
              if (savedAnswer?.status === "completed") {
                await finishAndNavigate();
                return;
              }
        
              if (
                questionCountRef.current >=
                MAX_QUESTIONS
              ) {
                console.log(
                  "🎯 Final answer received."
                );
        
                await finishAndNavigate();
              }
            }
          }
        }

      // =================================
      // 5. OUTPUT TRANSCRIPTION FINISHED
      // =================================

      // Gemini Live does not expose `finished` on outputTranscription.
      // generationComplete indicates that model generation has finished.
      if (serverContent.generationComplete === true) {
        const finalOutput =
          outputTranscriptRef.current.trim();

        outputTranscriptRef.current = "";

        setAiSpeaking(false);

        if (finalOutput) {
          console.log(
            "🤖 FINAL GEMINI:",
            finalOutput,
          );

          // First response = greeting
          if (
            firstAiResponseRef.current
          ) {
            firstAiResponseRef.current =
              false;

            await saveMessage(
              "ai",
              "greeting",
              finalOutput,
            );

            return;
          }

          // Maximum questions reached
          if (
            questionCountRef.current >=
            MAX_QUESTIONS
          ) {
            return;
          }

          // Detect closing message
          const lower =
            finalOutput.toLowerCase();

          const isClosing =
            lower.includes(
              "that concludes",
            ) ||
            lower.includes(
              "interview is complete",
            ) ||
            lower.includes(
              "thank you for completing",
            ) ||
            lower.includes(
              "thanks for completing",
            ) ||
            lower.includes("we're done") ||
            lower.includes("goodbye");

          if (isClosing) {
            await saveMessage(
              "ai",
              "greeting",
              finalOutput,
            );

            return;
          }

          // Normal AI question
          if (
            !waitingForAnswerRef.current
          ) {
            waitingForAnswerRef.current =
              true;

            setCurrentQuestion(
              finalOutput,
            );

            setLastAnswer("");

            await saveMessage(
              "ai",
              "question",
              finalOutput,
            );
          }
        }
      }

      // =================================
      // 6. Gemini interrupted
      // =================================

      if (
        serverContent.interrupted
      ) {
        setAiSpeaking(false);

        audioPlayerRef.current?.interrupt();
      }
    } catch (error) {
      console.error(
        "❌ Error processing Gemini message:",
        error,
      );
    }
  };

  // --------------------------------
  // Start interview
  // --------------------------------

  const startInterview = async () => {
    try {
      setLoading(true);
      setError("");

      if (!interviewId) {
        setError(
          "Interview ID is missing.",
        );

        setLoading(false);
        return;
      }

      // Get interview data
      const interviewResponse =
        await api.get(
          `/interview/${interviewId}`,
        );

      const {
        candidateProfile,
        githubRepositories,
        status,
        questionCount:
          existingQuestionCount,
      } = interviewResponse.data;

      if (status === "completed") {
        navigate(
          `/result/${interviewId}`,
          { replace: true },
        );

        return;
      }

      // Restore question count
      questionCountRef.current =
        existingQuestionCount || 0;

      setQuestionCount(
        questionCountRef.current,
      );

      // Start backend interview
      await api.patch(
        `/interview/${interviewId}/start`,
      );

      // Get Gemini token
      const tokenResponse =
        await api.get(
          "/live-token",
        );

      if (!tokenResponse.data?.token) {
        throw new Error(
          "Gemini token was not received",
        );
      }

      const ephemeralToken =
        tokenResponse.data.token;

      // Initialize audio player
      const audioPlayer =
        new AudioPlayer();

      audioPlayerRef.current =
        audioPlayer;

      await audioPlayer.init();

      // Reset interview state
      inputTranscriptRef.current = "";
      outputTranscriptRef.current = "";

      firstAiResponseRef.current = true;
      waitingForAnswerRef.current = false;
      completionStartedRef.current = false;

      setCurrentQuestion("");
      setUserTranscript("");
      setLastAnswer("");
      setSeconds(0);

      // Connect Gemini
      const gemini =
        connectToGemini(
          ephemeralToken,
          candidateProfile,
          githubRepositories,
          handleGeminiMessage,
        );

      geminiRef.current = gemini;

      // Wait for WebSocket
      await new Promise<void>(
        (resolve, reject) => {
          const websocket =
            gemini.websocket;

          if (
            websocket.readyState ===
            WebSocket.OPEN
          ) {
            resolve();
            return;
          }

          const timeout = setTimeout(() => {
            reject(
              new Error(
                "Gemini WebSocket connection timeout",
              ),
            );
          }, 10000);

          const originalOpen =
            websocket.onopen;

          const originalClose =
            websocket.onclose;

          websocket.onopen = (event) => {
            if (originalOpen) {
              originalOpen.call(
                websocket,
                event,
              );
            }

            clearTimeout(timeout);

            console.log(
              "✅ Gemini WebSocket ready",
            );

            resolve();
          };

          websocket.onclose = (event) => {
            if (originalClose) {
              originalClose.call(
                websocket,
                event,
              );
            }

            clearTimeout(timeout);

            reject(
              new Error(
                `Gemini WebSocket closed before interview started. Code: ${event.code}`,
              ),
            );
          };
        },
      );

      // Send candidate context
      gemini.sendCandidateContext();

      // Start microphone
      const audioStreamer =
        new AudioStreamer(gemini);

      audioStreamerRef.current =
        audioStreamer;

      await audioStreamer.start();

      setMicActive(true);
      setConnected(true);
      setInterviewStarted(true);
      setLoading(false);

      console.log(
        "🚀 LIVE INTERVIEW STARTED",
      );
    } catch (error) {
      console.error(
        "❌ Failed to start interview:",
        error,
      );

      // Cleanup
      audioStreamerRef.current?.stop();
      audioStreamerRef.current = null;

      audioPlayerRef.current?.destroy();
      audioPlayerRef.current = null;

      const websocket =
        geminiRef.current?.websocket;

      if (
        websocket &&
        websocket.readyState ===
          WebSocket.OPEN
      ) {
        websocket.close();
      }

      geminiRef.current = null;

      setConnected(false);
      setMicActive(false);
      setInterviewStarted(false);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to start interview. Please try again.",
      );

      setLoading(false);
    }
  };

  // --------------------------------
  // Stop interview
  // --------------------------------

  const stopInterview = async () => {
    if (completing) {
      return;
    }

    console.log(
      "🛑 User clicked End Interview",
    );

    await finishAndNavigate();
  };

  // --------------------------------
  // Cleanup
  // --------------------------------

  useEffect(() => {
    return () => {
      audioStreamerRef.current?.stop();
      audioStreamerRef.current = null;

      audioPlayerRef.current?.destroy();
      audioPlayerRef.current = null;

      const websocket =
        geminiRef.current?.websocket;

      if (
        websocket &&
        websocket.readyState ===
          WebSocket.OPEN
      ) {
        websocket.close();
      }

      geminiRef.current = null;
    };
  }, []);

  // --------------------------------
  // Loading
  // --------------------------------

  if (
    loading &&
    !interviewStarted
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <Loader2 className="mx-auto h-7 w-7 animate-spin text-primary" />

          <p className="mt-4 text-sm text-muted-foreground">
            Preparing your interview...
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------
  // Initial error
  // --------------------------------

  if (
    error &&
    !interviewStarted
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-md text-center">
          <p className="text-sm text-destructive">
            {error}
          </p>

          <Button
            onClick={() =>
              navigate("/dashboard")
            }
            className="mt-5"
          >
            Go Back
          </Button>
        </div>
      </main>
    );
  }

  // --------------------------------
  // UI
  // --------------------------------

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* =================================
          HEADER
      ================================== */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <LogoMark className="h-6 w-6" />

          <span className="hidden text-[13px] font-medium sm:inline">
            AI Technical Interview
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground sm:gap-5">
          {interviewStarted && (
            <>
              <span>
                Q{" "}
                {String(
                  Math.min(
                    questionCount + 1,
                    MAX_QUESTIONS,
                  ),
                ).padStart(2, "0")}{" "}
                / {MAX_QUESTIONS}
              </span>

              <span className="text-foreground">
                {minutes}:{remainingSeconds}
              </span>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={
              interviewStarted
                ? stopInterview
                : () =>
                    navigate("/dashboard")
            }
            disabled={completing}
            className="h-8 px-2.5 text-xs"
          >
            {interviewStarted
              ? "Exit"
              : "Back"}
          </Button>
        </div>
      </header>

      {/* =================================
          MAIN
      ================================== */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-10 sm:px-6">
        {/* Very subtle background accents */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/[0.025] blur-3xl" />

        <div className="relative w-full max-w-4xl">
          {!interviewStarted ? (
            /* =================================
               PRE-INTERVIEW
            ================================== */
            <section className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>

              <p className="label-eyebrow mt-8">
                AI Technical Interview
              </p>

              <h1 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-[42px]">
                Ready when you are.
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
                Your GitHub profile and resume will
                be used to personalize the interview.
                Answer naturally by voice while the
                AI interviewer guides the conversation.
              </p>

              {/* Interview details */}
              <div className="mx-auto mt-9 grid max-w-xl grid-cols-1 overflow-hidden rounded-xl border border-border bg-card text-left sm:grid-cols-3">
                <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    Candidate
                  </p>

                  <p className="mt-2 truncate text-[13px] font-medium">
                    {candidateProfile?.name ||
                      "Candidate"}
                  </p>
                </div>

                <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    Interview
                  </p>

                  <p className="mt-2 text-[13px] font-medium">
                    Voice
                  </p>
                </div>

                <div className="p-4">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                    Questions
                  </p>

                  <p className="mt-2 text-[13px] font-medium">
                    Up to {MAX_QUESTIONS}
                  </p>
                </div>
              </div>

              {error && (
                <p className="mt-5 text-sm text-destructive">
                  {error}
                </p>
              )}

              {/* Start */}
              <div className="mt-9 flex justify-center">
                <Button
                  onClick={startInterview}
                  disabled={loading}
                  size="lg"
                  className="h-11 min-w-[190px] gap-2 px-5"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Start Interview
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 font-mono text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Mic className="h-3 w-3" />
                  Voice interview
                </span>

                <span>•</span>

                <span>AI Powered</span>

                <span>•</span>

                <span>
                  Personalized questions
                </span>
              </div>
            </section>
          ) : (
            /* =================================
               LIVE INTERVIEW
            ================================== */
            <section className="mx-auto max-w-3xl">
              {/* Status */}
              <div className="flex justify-center">
                <div
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1",
                    aiSpeaking
                      ? "border-primary/20 bg-primary/10"
                      : userSpeaking
                        ? "border-primary/20 bg-primary/10"
                        : "border-border bg-card",
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      aiSpeaking ||
                        userSpeaking ||
                        connected
                        ? "bg-primary"
                        : "bg-muted-foreground",
                      (aiSpeaking ||
                        userSpeaking) &&
                        "animate-pulse",
                    )}
                  />

                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                    {aiSpeaking
                      ? "AI Speaking"
                      : userSpeaking
                        ? "Listening"
                        : connected
                          ? "Live"
                          : "Connecting"}
                  </span>
                </div>
              </div>

              {/* Conversation area */}
              <div className="mt-10">
                {/* AI */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />

                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      AI Interviewer
                    </span>
                  </div>

                  <div className="mx-auto mt-7 max-w-3xl">
                    {currentQuestion ? (
                      <p
                        className={cn(
                          "text-2xl font-medium leading-[1.35] tracking-[-0.025em] sm:text-[34px]",
                          aiSpeaking &&
                            "animate-in fade-in duration-300",
                        )}
                      >
                        {currentQuestion}
                      </p>
                    ) : (
                      <div className="flex min-h-[130px] items-center justify-center">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />

                          <span>
                            Waiting for the interviewer...
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Waveform */}
                <div className="mt-10 flex min-h-[48px] items-center justify-center">
                  <Waveform
                    bars={36}
                    active={
                      aiSpeaking ||
                      micActive
                    }
                  />
                </div>

                {/* State hint */}
                <div className="mt-5 flex justify-center">
                  <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                    {aiSpeaking ? (
                      <>
                        <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                        Speaking
                      </>
                    ) : userSpeaking ? (
                      <>
                        <Mic className="h-3.5 w-3.5 text-primary" />
                        Listening to your answer
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5" />
                        Your microphone is active
                      </>
                    )}
                  </div>
                </div>

                {/* Candidate transcript */}
                {(userTranscript ||
                  lastAnswer) && (
                  <div className="mx-auto mt-8 max-w-2xl border-t border-border pt-5 text-center">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                      Your response
                    </p>

                    <p className="mt-3 text-sm leading-6 text-foreground/80">
                      {userTranscript ||
                        lastAnswer}
                    </p>

                    {userSpeaking && (
                      <div className="mt-3 flex items-center justify-center gap-1.5">
                        <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
                        <span className="font-mono text-[9px] text-primary">
                          Listening...
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Error */}
                {error && (
                  <p className="mt-6 text-center text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* =================================
          FOOTER / CONTROLS
      ================================== */}
      <footer className="shrink-0 border-t border-border">
        <div className="mx-auto flex min-h-[68px] max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-6">
          {!interviewStarted ? (
            <>
              <div className="hidden items-center gap-2 text-muted-foreground sm:flex">
                <Mic className="h-3.5 w-3.5" />

                <span className="font-mono text-[10px]">
                  Microphone access required
                </span>
              </div>

              <div className="ml-auto flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
                <span>
                  Voice
                </span>

                <span className="h-1 w-1 rounded-full bg-border" />

                <span>
                  {MAX_QUESTIONS} questions max
                </span>
              </div>
            </>
          ) : (
            <>
              {/* Microphone */}
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
                    micActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {micActive ? (
                    <Mic className="h-4 w-4" />
                  ) : (
                    <MicOff className="h-4 w-4" />
                  )}
                </div>

                <div className="hidden min-w-0 sm:block">
                  <p className="text-[11px] font-medium">
                    {micActive
                      ? "Microphone active"
                      : "Microphone inactive"}
                  </p>

                  <p className="font-mono text-[9px] text-muted-foreground">
                    {connected
                      ? "Live connection"
                      : "Connecting..."}
                  </p>
                </div>
              </div>

              {/* Session stats */}
              <div className="flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
                <span>
                  {questionCount}/
                  {MAX_QUESTIONS}
                </span>

                <span className="hidden h-1 w-1 rounded-full bg-border sm:block" />

                <span>
                  {minutes}:{remainingSeconds}
                </span>
              </div>

              {/* End */}
              <Button
                variant="outline"
                size="sm"
                onClick={stopInterview}
                disabled={completing}
                className="shrink-0 gap-2"
              >
                {completing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span className="hidden sm:inline">
                      Completing...
                    </span>
                  </>
                ) : (
                  <>
                    <PhoneOff className="h-3.5 w-3.5" />
                    End Interview
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};

export default InterviewPage;

