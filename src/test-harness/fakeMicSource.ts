import type { MicSource, AudioDataHandler, MicSubscription } from '../services/micSource';

/**
 * In-process mic source that streams pre-loaded PCM instead of opening
 * the device microphone. Drives `onAudioData` listeners with chunks the
 * same shape and cadence the native module would.
 *
 * Wave format expected: signed 16-bit little-endian PCM, mono, sample
 * rate matching `startCapture(sampleRate)`. Mismatch will not crash but
 * Gemini will mis-interpret the audio.
 *
 * Cadence: emits `framesPerChunk` samples every `chunkIntervalMs` until
 * the buffer is exhausted, then loops back to the start (so a long
 * session keeps having "audio" coming in).
 */

const DEFAULT_FRAMES_PER_CHUNK = 320; // 20 ms at 16 kHz
const DEFAULT_CHUNK_INTERVAL_MS = 20;

let pcmBuffer: Uint8Array | null = null;
let bufferOffset = 0;
let listeners: AudioDataHandler[] = [];
let intervalHandle: ReturnType<typeof setInterval> | null = null;
let configuredSampleRate = 0;
let framesPerChunk = DEFAULT_FRAMES_PER_CHUNK;
let chunkIntervalMs = DEFAULT_CHUNK_INTERVAL_MS;
let loop = true;

function bytesToBase64(bytes: Uint8Array): string {
  // Buffer is reliable in Hermes/Node + RN environments alike.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return Buffer.from(bytes).toString('base64');
}

/**
 * Load the PCM buffer the fake mic should stream. Replaces any
 * previously-loaded buffer. Resets the read offset to 0.
 */
export function loadPcmFixture(
  pcm: Uint8Array,
  options: { framesPerChunk?: number; chunkIntervalMs?: number; loop?: boolean } = {},
): void {
  pcmBuffer = pcm;
  bufferOffset = 0;
  framesPerChunk = options.framesPerChunk ?? DEFAULT_FRAMES_PER_CHUNK;
  chunkIntervalMs = options.chunkIntervalMs ?? DEFAULT_CHUNK_INTERVAL_MS;
  loop = options.loop ?? true;
}

/**
 * Generate a synthetic PCM16 buffer for self-tests (no real WAV needed).
 * 1 second of silence, 1 second of speech-amplitude sine, etc.
 */
export function generateSyntheticPcm(opts: {
  durationSec: number;
  sampleRate: number;
  /** 0 = silence, 1 = full-scale */
  amplitude: number;
  /** Hz; 0 = DC */
  frequency: number;
}): Uint8Array {
  const totalSamples = Math.floor(opts.durationSec * opts.sampleRate);
  const buf = new Uint8Array(totalSamples * 2);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / opts.sampleRate;
    const v = opts.frequency === 0
      ? opts.amplitude * 32767
      : Math.sin(2 * Math.PI * opts.frequency * t) * opts.amplitude * 32767;
    let s = Math.round(v);
    if (s > 32767) s = 32767;
    if (s < -32768) s = -32768;
    if (s < 0) s += 0x10000;
    buf[i * 2] = s & 0xff;
    buf[i * 2 + 1] = (s >> 8) & 0xff;
  }
  return buf;
}

function emitNextChunk(): void {
  if (!pcmBuffer || pcmBuffer.byteLength === 0) return;

  const chunkBytes = framesPerChunk * 2; // int16
  let end = bufferOffset + chunkBytes;
  let chunk: Uint8Array;

  if (end <= pcmBuffer.byteLength) {
    chunk = pcmBuffer.subarray(bufferOffset, end);
    bufferOffset = end;
  } else {
    // Partial tail; pad or wrap.
    const tail = pcmBuffer.subarray(bufferOffset);
    if (loop) {
      const wrap = pcmBuffer.subarray(0, chunkBytes - tail.byteLength);
      chunk = new Uint8Array(chunkBytes);
      chunk.set(tail, 0);
      chunk.set(wrap, tail.byteLength);
      bufferOffset = wrap.byteLength;
    } else {
      // Pad with silence and stop emitting after this chunk.
      chunk = new Uint8Array(chunkBytes);
      chunk.set(tail, 0);
      bufferOffset = pcmBuffer.byteLength;
      stopEmitting();
    }
  }

  if (bufferOffset >= pcmBuffer.byteLength && !loop) {
    stopEmitting();
  }

  const data = bytesToBase64(chunk);
  for (const h of [...listeners]) h({ data });
}

function startEmitting(): void {
  if (intervalHandle) return;
  intervalHandle = setInterval(emitNextChunk, chunkIntervalMs);
}

function stopEmitting(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}

export const fakeMicSource: MicSource = {
  async startCapture(sampleRate: number): Promise<void> {
    configuredSampleRate = sampleRate;
    if (pcmBuffer && pcmBuffer.byteLength > 0) {
      startEmitting();
    } else {
      console.warn(
        '[fakeMicSource] startCapture called but no PCM fixture loaded — ' +
        'call loadPcmFixture() before starting the session.',
      );
    }
  },

  async stopCapture(): Promise<void> {
    stopEmitting();
    bufferOffset = 0;
  },

  addListener(handler: AudioDataHandler): MicSubscription {
    listeners.push(handler);
    return {
      remove: () => {
        const i = listeners.indexOf(handler);
        if (i >= 0) listeners.splice(i, 1);
      },
    };
  },
};

/** Test-only: returns the configured sample rate of the last startCapture call. */
export function __getFakeMicSampleRate(): number {
  return configuredSampleRate;
}

/** Test-only: clear all listeners + buffer. */
export function __resetFakeMic(): void {
  stopEmitting();
  listeners = [];
  pcmBuffer = null;
  bufferOffset = 0;
  configuredSampleRate = 0;
}
