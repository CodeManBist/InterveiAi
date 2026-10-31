/**
 * Audio Worklet Processor for capturing and processing audio
 */

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 512; // 32ms at 16kHz — per Gemini best practices (20-40ms chunks)
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input && input.length > 0) {
      const inputChannel = input[0];

      // Buffer the incoming audio
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex++] = inputChannel[i];

        // When buffer is full, send it to main thread
        if (this.bufferIndex >= this.bufferSize) {
          let sumSquares = 0;
          for (let j = 0; j < this.bufferSize; j++) {
            const sample = this.buffer[j];
            sumSquares += sample * sample;
          }
          const rms = Math.sqrt(sumSquares / this.bufferSize);

          // Send the buffered audio to the main thread.
          // Capture time is stamped on the main thread (not AudioContext time).
          this.port.postMessage({
            type: "audio",
            data: this.buffer.slice(),
            rms,
          });

          // Reset buffer
          this.bufferIndex = 0;
        }
      }
    }

    // Return true to keep the processor alive
    return true;
  }
}

// Register the processor
registerProcessor("audio-capture-processor", AudioCaptureProcessor);