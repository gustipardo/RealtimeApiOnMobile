import { isTestMode } from '../config/env';
import { setMicSource } from '../services/micSource';
import { fakeMicSource, loadPcmFixture, generateSyntheticPcm } from './fakeMicSource';

/**
 * Test-mode bootstrap. Call ONCE during app startup (e.g. in
 * `src/app/_layout.tsx`'s root effect) to swap the mic source over
 * to `fakeMicSource` when APP_MODE=test.
 *
 * No-op in dev / production.
 */
export function installTestHarness(): void {
  if (!isTestMode()) return;

  console.log('[test-harness] Installing fake mic source — APP_MODE=test');
  setMicSource(fakeMicSource);

  // Default fixture so a session can start even if no audio has been
  // explicitly loaded yet. 30 seconds of low-level pink-ish noise so
  // the level meter reads "Quiet" instead of "No mic data".
  if (typeof globalThis !== 'undefined' && !(globalThis as any).__PCM_FIXTURE_LOADED__) {
    const placeholder = generateSyntheticPcm({
      durationSec: 30,
      sampleRate: 16000,
      amplitude: 0.02,
      frequency: 200,
    });
    loadPcmFixture(placeholder);
  }
}

/**
 * Convenience for tests/CLIs that want to load a specific PCM clip
 * before starting a session. The clip should be 16-bit signed
 * little-endian PCM at 16 kHz mono — matching what Gemini Live expects.
 */
export { loadPcmFixture, generateSyntheticPcm } from './fakeMicSource';
