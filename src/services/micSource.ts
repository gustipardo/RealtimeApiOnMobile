import ExpoForegroundAudioModule from 'expo-foreground-audio';

/**
 * Abstraction over the microphone input pipeline.
 *
 * Production / dev: delegates to `expo-foreground-audio` (`realMicSource`).
 * Test mode (APP_MODE=test): swap in `fakeMicSource` (test-harness/) which
 *   streams PCM from a pre-loaded buffer instead of opening the device mic.
 *
 * Why a layer at all? The send path in geminiManager + the level meter in
 * audioLevelTracker both need the same chunks; a single abstraction keeps
 * them in sync without each one re-mocking the native module.
 */

export type AudioDataEvent = { data: string };
export type AudioDataHandler = (event: AudioDataEvent) => void;
export interface MicSubscription {
  remove(): void;
}

export interface MicSource {
  startCapture(sampleRate: number): Promise<void>;
  stopCapture(): Promise<void>;
  addListener(handler: AudioDataHandler): MicSubscription;
}

const realMicSource: MicSource = {
  startCapture: (sampleRate) => ExpoForegroundAudioModule.startMicCapture(sampleRate),
  stopCapture: () => ExpoForegroundAudioModule.stopMicCapture(),
  addListener: (handler) =>
    ExpoForegroundAudioModule.addListener('onAudioData', handler),
};

let activeSource: MicSource = realMicSource;

/**
 * Swap the mic source. Called by the test harness setup to install
 * `fakeMicSource`. Pass `null` to revert to the real one.
 */
export function setMicSource(source: MicSource | null): void {
  activeSource = source ?? realMicSource;
}

export function getMicSource(): MicSource {
  return activeSource;
}

/**
 * Façade — call these from the rest of the app, never the active source
 * directly. Keeps the "current source" indirection in one place.
 */
export const micSource = {
  startCapture: (sampleRate: number) => activeSource.startCapture(sampleRate),
  stopCapture: () => activeSource.stopCapture(),
  addListener: (handler: AudioDataHandler) => activeSource.addListener(handler),
};
