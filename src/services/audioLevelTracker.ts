import { micSource } from './micSource';
import { useAudioLevelStore } from '../stores/useAudioLevelStore';

/**
 * Real RMS-based microphone level meter.
 *
 * Subscribes to the same `onAudioData` events that `geminiManager`
 * uses for upload, but in a separate listener so the send path is
 * untouched. For each chunk:
 *   1. base64-decode → Int16Array (little-endian PCM, 16 kHz mono).
 *   2. Compute RMS = sqrt(mean(samples²)) / 32768  (normalized).
 *   3. Smooth with an exponential moving average (attack > release
 *      so the meter feels responsive but doesn't twitch).
 *   4. Push to `useAudioLevelStore`.
 *
 * Why not just reuse geminiManager's audio event? Because the meter
 * should keep working independent of provider, and we don't want to
 * couple display logic to the send-path lifecycle (the meter is
 * useful even before a session starts, for "test the mic" UX).
 */

const FULL_SCALE_INT16 = 32768;
const ATTACK = 0.5;   // how fast the meter rises (closer to 1 = snappier)
const RELEASE = 0.15; // how fast it falls back (smaller = smoother decay)

let subscription: { remove(): void } | null = null;
let smoothedLevel = 0;

/**
 * Decode a base64 string into a Uint8Array.
 * Uses globalThis.atob in Hermes/RN 0.71+; falls back to Buffer.
 */
function base64ToBytes(b64: string): Uint8Array {
  const atobFn: ((s: string) => string) | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as any).atob : undefined;

  if (typeof atobFn === 'function') {
    const binary = atobFn(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Fallback for environments without atob (older RN, some test runners).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/**
 * Compute normalized RMS amplitude from a base64-encoded PCM int16 chunk.
 * Returns a value in [0, 1] where 1 is full-scale.
 *
 * Exported for unit tests — feed a known waveform, assert the level.
 */
export function computeRmsFromBase64Pcm16(b64Chunk: string): number {
  if (!b64Chunk) return 0;
  const bytes = base64ToBytes(b64Chunk);
  // PCM int16 little-endian → 2 bytes per sample.
  const sampleCount = Math.floor(bytes.length / 2);
  if (sampleCount === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < sampleCount; i++) {
    const lo = bytes[i * 2];
    const hi = bytes[i * 2 + 1];
    // Sign-extend the int16.
    let s = (hi << 8) | lo;
    if (s >= 0x8000) s -= 0x10000;
    const norm = s / FULL_SCALE_INT16;
    sumSquares += norm * norm;
  }

  return Math.sqrt(sumSquares / sampleCount);
}

export function levelToDb(level: number): number {
  if (level <= 0) return -Infinity;
  return 20 * Math.log10(level);
}

/**
 * Start tracking mic level. Idempotent — calling twice is a no-op.
 */
export function startAudioLevelTracking(): void {
  if (subscription) return;
  smoothedLevel = 0;
  useAudioLevelStore.getState().reset();
  useAudioLevelStore.getState().setListening(true);

  subscription = micSource.addListener(
    (event: { data: string }) => {
      try {
        const rms = computeRmsFromBase64Pcm16(event.data);
        const coeff = rms > smoothedLevel ? ATTACK : RELEASE;
        smoothedLevel = smoothedLevel + coeff * (rms - smoothedLevel);

        const store = useAudioLevelStore.getState();
        store.setLevel(smoothedLevel, levelToDb(smoothedLevel));
        store.incrementChunks();
      } catch (err) {
        // Diagnostic only — never throw from the audio path.
        console.warn('[audioLevelTracker] sample error:', err);
      }
    },
  );
}

export function stopAudioLevelTracking(): void {
  subscription?.remove();
  subscription = null;
  smoothedLevel = 0;
  useAudioLevelStore.getState().reset();
}
