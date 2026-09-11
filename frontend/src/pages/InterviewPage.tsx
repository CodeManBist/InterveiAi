import { useRef, useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

import {
  Mic,
  MicOff,
  LogOut,
  Loader2,
  Volume2,
  Brain,
  MessageCircle,
} from "lucide-react";

import { connectToGemini } from "../utils/geminiWebSocket";
import {
  AudioStreamer,
  AudioPlayer,
} from "../utils/mediaUtils";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  const questionCountRef = useRef(0);

  const messageSaveChainRef = useRef<Promise<unknown>>(Promise.resolve());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [interviewStarted, setInterviewStarted] =
    useState(false);

  const [completing, setCompleting] =
    useState(false);

  // --------------------------------
  // Refs
  // --------------------------------

  const geminiRef =
    useRef<ReturnType<typeof connectToGemini> | null>(null);

  const audioStreamerRef =
    useRef<AudioStreamer | null>(null);

  const audioPlayerRef =
    useRef<AudioPlayer | null>(null);

  // Prevent completion twice
  const completionStartedRef =
    useRef(false);

  // --------------------------------
  // Transcript buffers
  // --------------------------------

  const inputTranscriptRef =
    useRef("");

  const outputTranscriptRef =
    useRef("");

  // First Gemini response is greeting
  const firstAiResponseRef =
    useRef(true);

  // We only want to accept answers when
  // Gemini has asked a question.
  const waitingForAnswerRef =
    useRef(false);

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

        const response = await axios.get(
          `http://localhost:3000/interview/${interviewId}`
        );

        const data = response.data;

        console.log(
          "📄 Interview data:",
          data
        );

        setCandidateProfile(
          data.candidateProfile
        );

        const restoredQuestionCount = data.questionCount || 0;

        questionCountRef.current = restoredQuestionCount;
        setQuestionCount(restoredQuestionCount);

        // Already completed
        if (data.status === "completed") {
          navigate(
            `/result/${interviewId}`,
            { replace: true }
          );
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error(
          "Failed to load interview:",
          error
        );

        setError(
          "Failed to load interview data."
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
    content: string
  ) => {
    if (!interviewId) {
      return null;
    }

    const cleanContent = content.trim();

    if (!cleanContent) {
      return null;
    }

    const saveOperation = messageSaveChainRef.current.then(async () => {
      try {
        console.log(
          `💾 Saving ${role}/${type}:`,
          cleanContent
        );

        const response = await axios.post(
          `http://localhost:3000/interview/${interviewId}/messages`,
          {
            role,
            type,
            content: cleanContent,
          }
        );

        console.log(
          "✅ Message saved:",
          response.data
        );

        if (
          typeof response.data.questionCount ===
          "number"
        ) {
          questionCountRef.current = response.data.questionCount;
          setQuestionCount(response.data.questionCount);
        }

        return response.data;
      } catch (error) {
        console.error(
          `❌ Failed to save ${role}/${type}:`,
          error
        );

        return null;
      }
    });

    messageSaveChainRef.current = saveOperation.catch(() => undefined);

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
        "🏁 Finishing interview..."
      );

      // --------------------------------
      // Stop microphone
      // --------------------------------

      audioStreamerRef.current?.stop();

      audioStreamerRef.current = null;

      // --------------------------------
      // Stop audio player
      // --------------------------------

      audioPlayerRef.current?.destroy();

      audioPlayerRef.current = null;

      // --------------------------------
      // Close Gemini WebSocket
      // --------------------------------

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

      // --------------------------------
      // Ask backend for latest status
      // --------------------------------

      const response = await axios.get(
        `http://localhost:3000/interview/${interviewId}`
      );

      console.log(
        "Final interview status:",
        response.data.status
      );

      // --------------------------------
      // If backend has not completed it,
      // manually complete it.
      // --------------------------------

      if (
        response.data.status !==
        "completed"
      ) {
        await axios.post(
          `http://localhost:3000/interview/${interviewId}/complete`
        );
      }

      // --------------------------------
      // Go to result page
      // --------------------------------

      console.log(
        "➡️ Redirecting to result..."
      );

      navigate(
        `/result/${interviewId}`,
        { replace: true }
      );
    } catch (error) {
      console.error(
        "Failed to complete interview:",
        error
      );

      completionStartedRef.current =
        false;

      setCompleting(false);

      setError(
        "Failed to complete interview."
      );
    }
  };

  // --------------------------------
  // Gemini message handler
  // --------------------------------

  const handleGeminiMessage = async (
    event: MessageEvent
  ) => {
    try {
      const text =
        typeof event.data === "string"
          ? event.data
          : await event.data.text();

      const response =
        JSON.parse(text);

      console.log(
        "📩 Gemini response:",
        response
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
            await audioPlayerRef.current?.play(
              part.inlineData.data
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

        console.log(
          "👤 User transcript chunk:",
          inputTranscript
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

        console.log(
          "🤖 Gemini transcript chunk:",
          outputTranscript
        );
      }

      // =================================
      // 4. INPUT TRANSCRIPTION FINISHED
      // =================================

      const inputFinished =
        inputTranscription?.finished ||
        serverContent.turnComplete;

      if (inputFinished) {
        const finalInput =
          inputTranscriptRef.current.trim();

        inputTranscriptRef.current = "";

        if (finalInput) {
          console.log(
            "👤 FINAL USER ANSWER:",
            finalInput
          );

          // --------------------------------
          // Only accept candidate speech as
          // an answer when AI asked a question.
          // --------------------------------

          if (
            waitingForAnswerRef.current
          ) {
            waitingForAnswerRef.current =
              false;

            const savedAnswer = await saveMessage(
              "user",
              "answer",
              finalInput
            );

            if (savedAnswer?.status === "completed") {
              await finishAndNavigate();
              return;
            }

            // --------------------------------
            // If question 10 was answered,
            // finish automatically.
            // --------------------------------

            if (
              questionCountRef.current >=
              MAX_QUESTIONS
            ) {
              console.log(
                "🎯 Final answer received."
              );

              await finishAndNavigate();
            }
          } else {
            console.log(
              "⚠️ User spoke while AI was not waiting for an answer."
            );
          }
        }
      }

      // =================================
      // 5. OUTPUT TRANSCRIPTION FINISHED
      // =================================

      const outputFinished =
        outputTranscription?.finished ||
        serverContent.turnComplete;

      if (outputFinished) {
        const finalOutput =
          outputTranscriptRef.current.trim();

        outputTranscriptRef.current = "";

        if (finalOutput) {
          console.log(
            "🤖 FINAL GEMINI:",
            finalOutput
          );

          // --------------------------------
          // First AI response = greeting
          // --------------------------------

          if (
            firstAiResponseRef.current
          ) {
            firstAiResponseRef.current =
              false;

            await saveMessage(
              "ai",
              "greeting",
              finalOutput
            );

            console.log(
              "👋 Greeting saved."
            );

            return;
          }

          // --------------------------------
          // If already reached 10 questions,
          // don't save another AI question.
          // --------------------------------

          if (
            questionCountRef.current >=
            MAX_QUESTIONS
          ) {
            console.log(
              "🛑 Maximum questions reached."
            );

            return;
          }

          // --------------------------------
          // Detect closing message
          // --------------------------------

          const lower =
            finalOutput.toLowerCase();

          const isClosing =
            lower.includes(
              "that concludes"
            ) ||
            lower.includes(
              "interview is complete"
            ) ||
            lower.includes(
              "thank you for completing"
            ) ||
            lower.includes(
              "thanks for completing"
            ) ||
            lower.includes(
              "we're done"
            ) ||
            lower.includes(
              "goodbye"
            );

          if (isClosing) {
            await saveMessage(
              "ai",
              "greeting",
              finalOutput
            );

            console.log(
              "👋 Closing message saved."
            );

            return;
          }

          // --------------------------------
          // Every normal AI turn after greeting
          // is treated as an interview question.
          //
          // IMPORTANT:
          // Your Gemini system instruction should
          // tell Gemini to ask ONE question per turn.
          // --------------------------------

          if (
            !waitingForAnswerRef.current
          ) {
            waitingForAnswerRef.current =
              true;

            await saveMessage(
              "ai",
              "question",
              finalOutput
            );

            console.log(
              `❓ Question ${
                questionCountRef.current + 1
              } saved.`
            );
          } else {
            console.log(
              "⚠️ Gemini generated another response while waiting for answer."
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
        console.log(
          "🛑 Gemini interrupted"
        );

        audioPlayerRef.current?.interrupt();
      }
    } catch (error) {
      console.error(
        "❌ Error processing Gemini message:",
        error
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
        setError("Interview ID is missing.");
        setLoading(false);
        return;
      }
  
      // ================================================
      // 1. GET INTERVIEW DATA
      // ================================================
  
      const interviewResponse = await axios.get(
        `http://localhost:3000/interview/${interviewId}`
      );
  
      const {
        candidateProfile,
        githubRepositories,
        status,
        questionCount: existingQuestionCount,
      } = interviewResponse.data;
  
      console.log("👤 Candidate:", candidateProfile);
      console.log("🐙 GitHub:", githubRepositories);
      console.log("❓ Existing questions:", existingQuestionCount);
  
      // ================================================
      // 2. CHECK IF ALREADY COMPLETED
      // ================================================
  
      if (status === "completed") {
        navigate(`/result/${interviewId}`, {
          replace: true,
        });
        return;
      }
  
      // ================================================
      // 3. RESTORE QUESTION COUNT
      // ================================================
  
      questionCountRef.current = existingQuestionCount || 0;
      setQuestionCount(questionCountRef.current);
  
      // ================================================
      // 4. START BACKEND INTERVIEW
      // ================================================
  
      await axios.patch(
        `http://localhost:3000/interview/${interviewId}/start`
      );
  
      console.log("✅ Backend interview started");
  
      // ================================================
      // 5. GET GEMINI EPHEMERAL TOKEN
      // ================================================
  
      const tokenResponse = await axios.get(
        "http://localhost:3000/live-token"
      );
  
      if (!tokenResponse.data?.token) {
        throw new Error("Gemini token was not received");
      }
  
      const ephemeralToken = tokenResponse.data.token;
  
      console.log("🔑 Ephemeral token received");
  
      // ================================================
      // 6. INITIALIZE AUDIO PLAYER
      // ================================================
  
      const audioPlayer = new AudioPlayer();
  
      audioPlayerRef.current = audioPlayer;
  
      await audioPlayer.init();
  
      console.log("🔊 Audio player initialized");
  
      // ================================================
      // 7. RESET INTERVIEW REFS
      // ================================================
  
      inputTranscriptRef.current = "";
      outputTranscriptRef.current = "";
  
      firstAiResponseRef.current = true;
      waitingForAnswerRef.current = false;
      completionStartedRef.current = false;
  
      // ================================================
      // 8. CONNECT TO GEMINI
      // ================================================
  
      const gemini = connectToGemini(
        ephemeralToken,
        candidateProfile,
        githubRepositories,
        handleGeminiMessage
      );
  
      geminiRef.current = gemini;
  
      console.log("🔌 Gemini connection created");
  
      // ================================================
      // 9. WAIT FOR GEMINI WEBSOCKET TO OPEN
      // ================================================
  
      await new Promise<void>((resolve, reject) => {
        const websocket = gemini.websocket;
  
        if (websocket.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }
  
        const timeout = setTimeout(() => {
          reject(
            new Error("Gemini WebSocket connection timeout")
          );
        }, 10000);
  
        const originalOpen = websocket.onopen;
        const originalClose = websocket.onclose;
  
        websocket.onopen = (event) => {
          if (originalOpen) {
            originalOpen.call(websocket, event);
          }
  
          clearTimeout(timeout);
  
          console.log(
            "✅ Gemini WebSocket is ready from Interview.tsx"
          );
  
          resolve();
        };
  
        websocket.onclose = (event) => {
          if (originalClose) {
            originalClose.call(websocket, event);
          }
  
          clearTimeout(timeout);
  
          reject(
            new Error(
              `Gemini WebSocket closed before interview started. Code: ${event.code}`
            )
          );
        };
      });
  
      // ================================================
      // 10. SEND CANDIDATE CONTEXT
      // ================================================
  
      gemini.sendCandidateContext();
  
      console.log("📄 Candidate context sent to Gemini");
  
      // ================================================
      // 11. START MICROPHONE
      // ================================================
  
      const audioStreamer = new AudioStreamer(gemini);
  
      audioStreamerRef.current = audioStreamer;
  
      await audioStreamer.start();
  
      console.log("🎤 Microphone started");
  
      setMicActive(true);
      setConnected(true);
      setInterviewStarted(true);
      setLoading(false);
  
      console.log("🚀 LIVE INTERVIEW STARTED");
  
    } catch (error) {
      console.error(
        "❌ Failed to start interview:",
        error
      );
  
      // ================================================
      // CLEANUP IF STARTUP FAILS
      // ================================================
  
      audioStreamerRef.current?.stop();
      audioStreamerRef.current = null;
  
      audioPlayerRef.current?.destroy();
      audioPlayerRef.current = null;
  
      const websocket =
        geminiRef.current?.websocket;
  
      if (
        websocket &&
        websocket.readyState === WebSocket.OPEN
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
          : "Failed to start interview. Please try again."
      );
  
      setLoading(false);
    }
  };

  // --------------------------------
  // Stop interview manually
  // --------------------------------

  const stopInterview = async () => {
    if (completing) {
      return;
    }

    console.log(
      "🛑 User clicked End Interview"
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
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-violet-400" />

          <p className="text-slate-300">
            Loading interview...
          </p>
        </div>
      </main>
    );
  }

  // --------------------------------
  // Error
  // --------------------------------

  if (
    error &&
    !interviewStarted
  ) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-red-400 mb-4">
            {error}
          </p>

          <Button
            onClick={() =>
              navigate("/")
            }
            className="bg-violet-600 hover:bg-violet-500"
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
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-6 py-12 relative overflow-hidden">

      <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />

      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl" />

      <div className="relative w-full max-w-4xl">

        {/* Header */}

        <div className="text-center mb-8">

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">

            <span className="text-violet-400">
              Live Interview
            </span>

          </h1>

          <p className="text-slate-400">
            {candidateProfile?.name
              ? `Welcome, ${candidateProfile.name}`
              : "AI Technical Interview"}
          </p>

        </div>

        <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl shadow-2xl">

          <CardContent className="p-6">

            <div className="space-y-6">

              {/* Candidate */}

              {candidateProfile && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10">

                    <p className="text-sm text-slate-400 mb-1">
                      Candidate
                    </p>

                    <p className="text-lg font-semibold text-violet-400">
                      {candidateProfile.name ||
                        "Unknown"}
                    </p>

                  </div>

                  <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10">

                    <p className="text-sm text-slate-400 mb-1">
                      GitHub
                    </p>

                    <p className="text-lg font-semibold text-violet-400">
                      @
                      {candidateProfile.github ||
                        "N/A"}
                    </p>

                  </div>

                </div>
              )}

              {/* Connection */}

              <div className="grid grid-cols-2 gap-4">

                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10">

                  <div className="flex items-center gap-2 mb-2">

                    {connected ? (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />

                        <p className="text-sm font-medium text-green-400">
                          Connected
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-slate-500 rounded-full" />

                        <p className="text-sm font-medium text-slate-400">
                          {interviewStarted
                            ? "Connecting..."
                            : "Not Connected"}
                        </p>
                      </>
                    )}

                  </div>

                  <p className="text-xs text-slate-500">
                    Gemini WebSocket
                  </p>

                </div>

                {/* Microphone */}

                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10">

                  <div className="flex items-center gap-2 mb-2">

                    {micActive ? (
                      <>
                        <Mic className="w-4 h-4 text-red-400 animate-pulse" />

                        <p className="text-sm font-medium text-red-400">
                          Recording
                        </p>
                      </>
                    ) : (
                      <>
                        <MicOff className="w-4 h-4 text-slate-500" />

                        <p className="text-sm font-medium text-slate-400">
                          {interviewStarted
                            ? "Processing..."
                            : "Inactive"}
                        </p>
                      </>
                    )}

                  </div>

                  <p className="text-xs text-slate-500">
                    Microphone Input
                  </p>

                </div>

              </div>

              {/* Question Counter */}

              {interviewStarted && (
                <div className="p-4 rounded-lg bg-gradient-to-r from-violet-500/20 to-blue-500/20 border border-violet-500/30">

                  <div className="flex items-center gap-3">

                    <Brain className="w-5 h-5 text-violet-400" />

                    <div>

                      <p className="text-sm text-slate-300">
                        Interview Progress
                      </p>

                      <p className="text-2xl font-bold text-violet-400">
                        {questionCount} /{" "}
                        {MAX_QUESTIONS} Questions
                      </p>

                    </div>

                  </div>

                </div>
              )}

              {/* Error */}

              {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">

                  <p className="text-sm text-red-400">
                    {error}
                  </p>

                </div>
              )}

              {/* Audio status */}

              {connected && micActive && (
                <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10">

                  <div className="flex items-center gap-2 mb-2">

                    <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />

                    <MessageCircle className="w-4 h-4 text-slate-400" />

                  </div>

                  <p className="text-sm text-slate-300">
                    Listening to your response...
                  </p>

                </div>
              )}

              {/* Buttons */}

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

                  <Button
                    onClick={stopInterview}
                    disabled={
                      loading ||
                      completing
                    }
                    className="flex-1 h-12 bg-red-600 hover:bg-red-500 text-white font-medium flex items-center justify-center gap-2"
                  >

                    {completing ? (
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

                )}

              </div>

              <p className="text-xs text-slate-500 text-center pt-4">

                Make sure your microphone is enabled and
                speaker volume is at a comfortable level.

              </p>

            </div>

          </CardContent>

        </Card>

      </div>

    </main>
  );
};

export default InterviewPage;