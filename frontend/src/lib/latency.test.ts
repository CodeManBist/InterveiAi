import { describe, expect, it } from "vitest";

import {
  SERVER_SILENCE_DURATION_MS,
  SPEECH_DEBOUNCE_BUFFERS,
  SPEECH_RMS_THRESHOLD,
  createLatencyTracker,
} from "./latency";

const SPEECH_RMS = SPEECH_RMS_THRESHOLD + 0.05;
const QUIET_RMS = SPEECH_RMS_THRESHOLD / 4;
const BUFFER_MS = 32;

function speak(
  tracker: ReturnType<typeof createLatencyTracker>,
  startTs: number,
  buffers: number,
): number {
  let ts = startTs;

  for (let i = 0; i < buffers; i++) {
    tracker.noteSpeechEnergy({
      rms: SPEECH_RMS,
      captureEndTs: ts,
      nowTs: ts,
      aiPlaying: false,
    });
    ts += BUFFER_MS;
  }

  return ts - BUFFER_MS;
}

describe("latency tracker", () => {
  it("records a normal sample after debounced speech", () => {
    const tracker = createLatencyTracker({ devLog: false });
    const t0 = speak(tracker, 1_000, SPEECH_DEBOUNCE_BUFFERS);

    expect(tracker.getLastSpeechTs()).toBe(t0);

    const arrivedAt = t0 + 2_000;
    const sample = tracker.onModelAudioChunk({
      alreadyPlaying: false,
      arrivedAt,
    });

    expect(sample).toEqual({
      totalMs: arrivedAt - t0,
      beyondVadMs: arrivedAt - t0 - SERVER_SILENCE_DURATION_MS,
    });
    expect(tracker.getStats().count).toBe(1);
    expect(tracker.getLastSpeechTs()).toBeNull();
  });

  it("drops barge-in when the model was already playing", () => {
    const tracker = createLatencyTracker({ devLog: false });
    const t0 = speak(tracker, 1_000, SPEECH_DEBOUNCE_BUFFERS);

    const sample = tracker.onModelAudioChunk({
      alreadyPlaying: true,
      arrivedAt: t0 + 2_000,
    });

    expect(sample).toBeNull();
    expect(tracker.getStats().count).toBe(0);
    expect(tracker.getLastSpeechTs()).toBe(t0);
  });

  it("drops a greeting when there was no prior user speech", () => {
    const tracker = createLatencyTracker({ devLog: false });

    const sample = tracker.onModelAudioChunk({
      alreadyPlaying: false,
      arrivedAt: 500,
    });

    expect(sample).toBeNull();
    expect(tracker.getStats().count).toBe(0);
  });

  it("overwrites t0 when the user resumes speaking before the reply", () => {
    const tracker = createLatencyTracker({ devLog: false });
    const firstT0 = speak(tracker, 1_000, SPEECH_DEBOUNCE_BUFFERS);
    const secondT0 = speak(tracker, firstT0 + BUFFER_MS, SPEECH_DEBOUNCE_BUFFERS);

    expect(tracker.getLastSpeechTs()).toBe(secondT0);
    expect(secondT0).toBeGreaterThan(firstT0);

    const arrivedAt = secondT0 + 1_800;
    const sample = tracker.onModelAudioChunk({
      alreadyPlaying: false,
      arrivedAt,
    });

    expect(sample?.totalMs).toBe(arrivedAt - secondT0);
    expect(sample?.totalMs).not.toBe(arrivedAt - firstT0);
  });

  it("does not set t0 from a single noisy buffer below the debounce count", () => {
    const tracker = createLatencyTracker({ devLog: false });

    tracker.noteSpeechEnergy({
      rms: SPEECH_RMS,
      captureEndTs: 1_000,
      nowTs: 1_000,
      aiPlaying: false,
    });

    expect(tracker.getLastSpeechTs()).toBeNull();

    const sample = tracker.onModelAudioChunk({
      alreadyPlaying: false,
      arrivedAt: 3_000,
    });

    expect(sample).toBeNull();
    expect(tracker.getStats().count).toBe(0);
  });

  it("shows calibrating before five quiet seconds exist", () => {
    const tracker = createLatencyTracker({ devLog: false });

    tracker.noteSpeechEnergy({
      rms: QUIET_RMS,
      captureEndTs: 0,
      nowTs: 0,
      aiPlaying: false,
    });

    const calibration = tracker.getCalibration();

    expect(calibration.calibrating).toBe(true);
    expect(calibration.quietSeconds).toBe(0);
    expect(calibration.noiseFloor).toBeNull();
    expect(calibration.suggestedThreshold).toBeNull();
  });
});
