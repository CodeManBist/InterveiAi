/**
 * Voice round-trip latency (client instrumentation).
 *
 * t0 = captureEndTs of the latest above-threshold mic chunk after debounce.
 *      The worklet posts at the END of each 512-sample buffer. The main
 *      thread should stamp t = performance.now() on receipt with NO
 *      subtraction of buffer duration. Error vs the audio-thread chunk
 *      end is about ±30 ms (postMessage / main-thread scheduling).
 * t1 = arrivedAt of the first modelTurn inlineData audio chunk after t0.
 * total perceived latency       = t1 - t0
 * latency beyond the VAD window = max(0, total - SERVER_SILENCE_DURATION_MS)
 *
 * Detection uses SPEECH_RMS_THRESHOLD (Float32 RMS in [-1, 1]).
 * suggestedThreshold is DEV/calibration only (noiseFloor * multiplier,
 * clamped to a minimum). It is not applied to detection until you change
 * SPEECH_RMS_THRESHOLD yourself.
 *
 * Verify calibration: stay quiet until quietSeconds >= NOISE_FLOOR_SECONDS
 * (suggestedThreshold becomes a number). Confirm latency:rms stays below
 * SPEECH_RMS_THRESHOLD. Speak; rms should go above the constant. Compare
 * suggestedThreshold to SPEECH_RMS_THRESHOLD and raise/lower the constant
 * if quiet is counted as speech or quiet speech is missed.
 */

export const SERVER_SILENCE_DURATION_MS = 1500;
export const SPEECH_RMS_THRESHOLD = 0.02;
export const SPEECH_DEBOUNCE_BUFFERS = 3;
export const ECHO_HOLDOFF_MS = 300;
export const NOISE_FLOOR_SECONDS = 5;
export const NOISE_WINDOW_MS = 1000;
export const NOISE_FLOOR_MULTIPLIER = 4;
export const SUGGESTED_THRESHOLD_MIN = 0.01;
export const CAPTURE_BUFFER_SIZE = 512;
export const CAPTURE_SAMPLE_RATE_HZ = 16000;

export type LatencySample = {
  totalMs: number;
  beyondVadMs: number;
};

export type LatencyPercentiles = {
  medianMs: number | null;
  p95Ms: number | null;
  minMs: number | null;
  maxMs: number | null;
};

export type CalibrationInfo = {
  quietSeconds: number;
  calibrating: boolean;
  noiseFloor: number | null;
  suggestedThreshold: number | null;
};

export type LatencyStats = {
  count: number;
  serverSilenceDurationMs: number;
  perceived: LatencyPercentiles;
  beyondVad: LatencyPercentiles;
  calibration: CalibrationInfo;
};

export type NoteSpeechEnergyInput = {
  rms: number;
  captureEndTs: number;
  nowTs: number;
  aiPlaying: boolean;
};

export type ModelAudioInput = {
  alreadyPlaying: boolean;
  arrivedAt: number;
};

export type LatencyTracker = {
  noteSpeechEnergy: (input: NoteSpeechEnergyInput) => void;
  onModelAudioChunk: (input: ModelAudioInput) => LatencySample | null;
  setAiPlaying: (playing: boolean, atTs: number) => void;
  getLastSpeechTs: () => number | null;
  getStats: () => LatencyStats;
  getCalibration: () => CalibrationInfo;
};

type TrackerOptions = {
  devLog?: boolean;
};

type StatsListener = (stats: LatencyStats) => void;

const listeners = new Set<StatsListener>();

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) {
    return null;
  }

  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );

  return sorted[index];
}

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return percentile([...values].sort((a, b) => a - b), 50);
}

function summarize(values: number[]): LatencyPercentiles {
  if (values.length === 0) {
    return {
      medianMs: null,
      p95Ms: null,
      minMs: null,
      maxMs: null,
    };
  }

  const sorted = [...values].sort((a, b) => a - b);

  return {
    medianMs: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    minMs: sorted[0],
    maxMs: sorted[sorted.length - 1],
  };
}

export function computeRms(pcm: Float32Array): number {
  if (pcm.length === 0) {
    return 0;
  }

  let sumSquares = 0;

  for (let i = 0; i < pcm.length; i++) {
    const sample = pcm[i];
    sumSquares += sample * sample;
  }

  return Math.sqrt(sumSquares / pcm.length);
}

function buildCalibration(quietSecondRms: number[]): CalibrationInfo {
  const quietSeconds = quietSecondRms.length;
  const calibrating = quietSeconds < NOISE_FLOOR_SECONDS;

  if (calibrating) {
    return {
      quietSeconds,
      calibrating: true,
      noiseFloor: null,
      suggestedThreshold: null,
    };
  }

  const quietest = [...quietSecondRms].sort((a, b) => a - b).slice(0, NOISE_FLOOR_SECONDS);
  const noiseFloor = median(quietest);

  if (noiseFloor == null) {
    return {
      quietSeconds,
      calibrating: true,
      noiseFloor: null,
      suggestedThreshold: null,
    };
  }

  return {
    quietSeconds,
    calibrating: false,
    noiseFloor,
    suggestedThreshold: Math.max(
      SUGGESTED_THRESHOLD_MIN,
      noiseFloor * NOISE_FLOOR_MULTIPLIER,
    ),
  };
}

export function createLatencyTracker(
  options: TrackerOptions = {},
): LatencyTracker {
  const devLog = options.devLog ?? false;

  let lastSpeechTs: number | null = null;
  let consecutiveAbove = 0;
  const samples: LatencySample[] = [];

  let aiPlaying = false;
  let aiStoppedAt: number | null = null;

  let windowStartTs: number | null = null;
  let windowRms: number[] = [];
  let windowHadSpeech = false;
  let windowHadEcho = false;
  const quietSecondRms: number[] = [];

  let lastRmsLogAt = Number.NEGATIVE_INFINITY;

  const isEchoBlocked = (nowTs: number): boolean => {
    if (aiPlaying) {
      return true;
    }

    if (aiStoppedAt != null && nowTs - aiStoppedAt < ECHO_HOLDOFF_MS) {
      return true;
    }

    return false;
  };

  const applyAiPlaying = (playing: boolean, atTs: number): void => {
    if (playing) {
      aiPlaying = true;
      aiStoppedAt = null;
      return;
    }

    if (aiPlaying) {
      aiStoppedAt = atTs;
    }

    aiPlaying = false;
  };

  const closeNoiseWindowIfNeeded = (nowTs: number): void => {
    if (windowStartTs == null) {
      return;
    }

    if (nowTs - windowStartTs < NOISE_WINDOW_MS) {
      return;
    }

    if (!windowHadSpeech && !windowHadEcho && windowRms.length > 0) {
      const windowMedian = median(windowRms);

      if (windowMedian != null) {
        quietSecondRms.push(windowMedian);
      }
    }

    windowStartTs = nowTs;
    windowRms = [];
    windowHadSpeech = false;
    windowHadEcho = false;
  };

  const getCalibration = (): CalibrationInfo => buildCalibration(quietSecondRms);

  const getStats = (): LatencyStats => ({
    count: samples.length,
    serverSilenceDurationMs: SERVER_SILENCE_DURATION_MS,
    perceived: summarize(samples.map((sample) => sample.totalMs)),
    beyondVad: summarize(samples.map((sample) => sample.beyondVadMs)),
    calibration: getCalibration(),
  });

  const maybeLogRms = (
    input: NoteSpeechEnergyInput,
    echoBlocked: boolean,
  ): void => {
    if (!devLog) {
      return;
    }

    if (input.nowTs - lastRmsLogAt < NOISE_WINDOW_MS) {
      return;
    }

    lastRmsLogAt = input.nowTs;
    const calibration = getCalibration();

    console.log("latency:rms", {
      rms: input.rms,
      threshold: SPEECH_RMS_THRESHOLD,
      aboveThreshold: input.rms > SPEECH_RMS_THRESHOLD,
      consecutiveAbove,
      debounceBuffers: SPEECH_DEBOUNCE_BUFFERS,
      echoBlocked,
      noiseFloor: calibration.noiseFloor,
      suggestedThreshold: calibration.calibrating
        ? "calibrating"
        : calibration.suggestedThreshold,
      quietSeconds: calibration.quietSeconds,
    });
  };

  const noteSpeechEnergy = (input: NoteSpeechEnergyInput): void => {
    applyAiPlaying(input.aiPlaying, input.nowTs);
    const echoBlocked = isEchoBlocked(input.nowTs);
    const aboveThreshold = input.rms > SPEECH_RMS_THRESHOLD;

    if (windowStartTs == null) {
      windowStartTs = input.nowTs;
    }

    closeNoiseWindowIfNeeded(input.nowTs);

    if (echoBlocked) {
      consecutiveAbove = 0;
      windowHadEcho = true;
      maybeLogRms(input, true);
      return;
    }

    if (aboveThreshold) {
      consecutiveAbove += 1;
      windowHadSpeech = true;

      if (consecutiveAbove >= SPEECH_DEBOUNCE_BUFFERS) {
        lastSpeechTs = input.captureEndTs;
      }
    } else {
      consecutiveAbove = 0;
      windowRms.push(input.rms);
    }

    maybeLogRms(input, false);
  };

  const onModelAudioChunk = (input: ModelAudioInput): LatencySample | null => {
    if (input.alreadyPlaying) {
      return null;
    }

    const t0 = lastSpeechTs;

    if (t0 == null) {
      return null;
    }

    const totalMs = input.arrivedAt - t0;
    const beyondVadMs = Math.max(0, totalMs - SERVER_SILENCE_DURATION_MS);
    const sample = { totalMs, beyondVadMs };

    samples.push(sample);
    lastSpeechTs = null;
    consecutiveAbove = 0;

    if (devLog) {
      const stats = getStats();

      console.log("latency:sample", {
        totalPerceivedMs: totalMs,
        beyondVadWindowMs: beyondVadMs,
        serverSilenceDurationMs: SERVER_SILENCE_DURATION_MS,
        count: stats.count,
        perceivedMedianMs: stats.perceived.medianMs,
        perceivedP95Ms: stats.perceived.p95Ms,
        beyondVadMedianMs: stats.beyondVad.medianMs,
        beyondVadP95Ms: stats.beyondVad.p95Ms,
      });
    }

    return sample;
  };

  const setAiPlaying = (playing: boolean, atTs: number): void => {
    applyAiPlaying(playing, atTs);
  };

  return {
    noteSpeechEnergy,
    onModelAudioChunk,
    setAiPlaying,
    getLastSpeechTs: () => lastSpeechTs,
    getStats,
    getCalibration,
  };
}

let defaultTracker = createLatencyTracker({
  devLog: import.meta.env.DEV,
});

function safe(label: string, fn: () => void): void {
  try {
    fn();
  } catch (error) {
    console.warn(`latency:${label}`, error);
  }
}

export function resetLatencyTracker(): void {
  defaultTracker = createLatencyTracker({
    devLog: import.meta.env.DEV,
  });
}

export function noteSpeechEnergy(input: NoteSpeechEnergyInput): void {
  safe("noteSpeechEnergy", () => {
    defaultTracker.noteSpeechEnergy(input);
  });
}

export function onModelAudioChunk(input: ModelAudioInput): void {
  safe("onModelAudioChunk", () => {
    const sample = defaultTracker.onModelAudioChunk(input);

    if (sample) {
      emitStats();
    }
  });
}

export function setAiPlaying(playing: boolean, atTs: number): void {
  safe("setAiPlaying", () => {
    defaultTracker.setAiPlaying(playing, atTs);
  });
}

export function getLastSpeechTs(): number | null {
  return defaultTracker.getLastSpeechTs();
}

export function getStats(): LatencyStats {
  return defaultTracker.getStats();
}

function emitStats(): void {
  const stats = getStats();

  for (const listener of listeners) {
    try {
      listener(stats);
    } catch (error) {
      console.warn("latency:listener", error);
    }
  }
}

export function subscribeLatencyStats(listener: StatsListener): () => void {
  listeners.add(listener);

  try {
    listener(getStats());
  } catch (error) {
    console.warn("latency:listener", error);
  }

  return () => {
    listeners.delete(listener);
  };
}

const VOICE_ACTIVITY_KEY =
  /activity|vad|voiceactivity|speech|endofspeech|startofspeech/i;

const reportedVoiceActivityKeys = new Set<string>();

function collectMatchingKeys(value: unknown, path: string, into: Set<string>): void {
  if (value == null || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      collectMatchingKeys(value[i], `${path}[${i}]`, into);
    }
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const nextPath = path ? `${path}.${key}` : key;

    if (VOICE_ACTIVITY_KEY.test(key)) {
      into.add(nextPath);
    }

    collectMatchingKeys(child, nextPath, into);
  }
}

/** One-time DEV log of any voice-activity-like fields on a Gemini message. */
export function inspectGeminiResponseForVoiceActivity(
  response: unknown,
): void {
  safe("inspectGeminiResponse", () => {
    if (!import.meta.env.DEV) {
      return;
    }

    const found = new Set<string>();
    collectMatchingKeys(response, "", found);

    const next = [...found].filter((key) => !reportedVoiceActivityKeys.has(key));

    if (next.length === 0) {
      return;
    }

    for (const key of next) {
      reportedVoiceActivityKeys.add(key);
    }

    console.log("latency:gemini-voice-activity-fields", next);
  });
}
