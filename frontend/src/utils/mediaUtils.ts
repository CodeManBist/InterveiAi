/**
 * Audio Streamer - Captures and streams microphone audio
 */
class AudioStreamer {
  client: any;
  audioContext: AudioContext | null;
  audioWorklet: AudioWorkletNode | null;
  mediaStream: MediaStream | null;
  audioSource: MediaStreamAudioSourceNode | null;
  isStreaming: boolean;
  sampleRate: number;

  constructor(geminiClient: any) {
    this.client = geminiClient;
    this.audioContext = null;
    this.audioWorklet = null;
    this.mediaStream = null;
    this.audioSource = null;
    this.isStreaming = false;
    this.sampleRate = 16000; // Gemini requires 16kHz
  }

  /**
   * Start streaming audio from microphone
   * @param {string} deviceId - Optional device ID for specific microphone
   */
  async start(deviceId: string | null = null) {
    if (this.isStreaming) {
      return;
    }
    try {
      // Build audio constraints
      const audioConstraints: any = {
        sampleRate: this.sampleRate,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };

      // Add device ID if specified
      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId };
      }

      // Get microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      // Create audio context at 16kHz if it doesn't exist
      if (!this.audioContext) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass({
          sampleRate: this.sampleRate,
        });
      }

      // Load the audio worklet module
      await this.audioContext!.audioWorklet.addModule(
        "/audio-processors/capture.worklet.js"
      );

      // Create the audio worklet node
      this.audioWorklet = new AudioWorkletNode(
        this.audioContext!,
        "audio-capture-processor"
      );

      // Set up message handling from the worklet
      this.audioWorklet.port.onmessage = (event: any) => {
        if (!this.isStreaming) return;

        if (event.data.type === "audio") {
          const inputData = event.data.data;
          const pcmData = this.convertToPCM16(inputData);
          const base64Audio = this.arrayBufferToBase64(pcmData);

          // Send to Gemini
          if (this.client) {
            this.client.sendAudioMessage(base64Audio);
          }
        }
      };

      // Ensure the context is running (it might be suspended by the browser or by us in stop())
      if (this.audioContext!.state === "suspended") {
        await this.audioContext!.resume();
      }

      // Connect the audio graph
      this.audioSource = this.audioContext!.createMediaStreamSource(
        this.mediaStream
      );
      this.audioSource.connect(this.audioWorklet);

      this.isStreaming = true;
      console.log("🎤 Audio streaming started");
      return true;
    } catch (error) {
      console.error("Failed to start audio streaming:", error);
      throw error;
    }
  }

  /**
   * Stop audio streaming
   */
  stop() {
    this.isStreaming = false;

    if (this.audioSource) {
      this.audioSource.disconnect();
      this.audioSource = null;
    }

    if (this.audioContext && this.audioContext.state === "running") {
      this.audioContext.suspend();
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    console.log("🛑 Audio streaming stopped");
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.stop();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Convert Float32Array to PCM16 Int16Array
   */
  convertToPCM16(float32Array: Float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample * 0x7fff;
    }
    return int16Array.buffer;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  arrayBufferToBase64(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

class AudioPlayer {
  audioContext: AudioContext | null;
  workletNode: AudioWorkletNode | null;
  gainNode: GainNode | null;
  isInitialized: boolean;
  initPromise: Promise<void> | null;
  volume: number;
  sampleRate: number;

  constructor() {
    this.audioContext = null;
    this.workletNode = null;
    this.gainNode = null;
    this.isInitialized = false;
    this.initPromise = null;
    this.volume = 1.0;
    this.sampleRate = 24000; // Gemini outputs at 24kHz
  }

  /**
   * Initialize the audio player
   */
  async init() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        // Create audio context at 24kHz to match Gemini
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioContextClass({
          sampleRate: this.sampleRate,
        });

        // Resume immediately since we are in a user-initiated gesture
        if (this.audioContext!.state === "suspended") {
          await this.audioContext!.resume();
        }

        // Load the audio worklet from external file
        await this.audioContext!.audioWorklet.addModule(
          "/audio-processors/playback.worklet.js"
        );

        // Create worklet node
        this.workletNode = new AudioWorkletNode(
          this.audioContext!,
          "pcm-processor"
        );

        // Create gain node for volume control
        this.gainNode = this.audioContext!.createGain();
        this.gainNode.gain.value = this.volume;

        // Connect nodes
        this.workletNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext!.destination);

        this.isInitialized = true;
        console.log("🔊 Audio player initialized");
      } catch (error) {
        console.error("Failed to initialize audio player:", error);
        this.initPromise = null;
        throw error;
      }
    })();

    return this.initPromise;
  }

  /**
   * Play audio chunk from base64 PCM
   */
  async play(base64Audio: string) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // Resume audio context if suspended
      if (this.audioContext && this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Efficient base64 → binary decode
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert PCM16 LE to Float32
      const inputArray = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(inputArray.length);
      for (let i = 0; i < inputArray.length; i++) {
        float32Data[i] = inputArray[i] / 32768;
      }

      // Send to worklet for playback
      this.workletNode?.port.postMessage(float32Data);
    } catch (error) {
      console.error("Error playing audio chunk:", error);
      throw error;
    }
  }

  /**
   * Interrupt current playback
   */
  interrupt() {
    if (this.workletNode) {
      this.workletNode.port.postMessage("interrupt");
    }
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.isInitialized = false;
    this.initPromise = null;
  }
}

  export { AudioStreamer, AudioPlayer };