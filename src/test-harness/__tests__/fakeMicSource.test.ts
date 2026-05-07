jest.mock('expo-foreground-audio', () => ({
  __esModule: true,
  default: { addListener: jest.fn().mockReturnValue({ remove: jest.fn() }) },
}));

import {
  fakeMicSource,
  loadPcmFixture,
  generateSyntheticPcm,
  __resetFakeMic,
  __getFakeMicSampleRate,
} from '../fakeMicSource';
import { computeRmsFromBase64Pcm16 } from '../../services/audioLevelTracker';

beforeEach(() => {
  __resetFakeMic();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('fakeMicSource', () => {
  it('emits no chunks if no fixture is loaded', async () => {
    const handler = jest.fn();
    fakeMicSource.addListener(handler);
    await fakeMicSource.startCapture(16000);
    jest.advanceTimersByTime(200);
    expect(handler).not.toHaveBeenCalled();
  });

  it('records the configured sample rate', async () => {
    loadPcmFixture(new Uint8Array(640));
    await fakeMicSource.startCapture(16000);
    expect(__getFakeMicSampleRate()).toBe(16000);
  });

  it('streams PCM chunks at the configured cadence', async () => {
    // 1 second of silence at 16 kHz — 32000 bytes.
    const pcm = generateSyntheticPcm({
      durationSec: 1, sampleRate: 16000, amplitude: 0, frequency: 0,
    });
    loadPcmFixture(pcm, { chunkIntervalMs: 20, framesPerChunk: 320 });

    const handler = jest.fn();
    fakeMicSource.addListener(handler);
    await fakeMicSource.startCapture(16000);

    // 100 ms → expect ~5 chunks.
    jest.advanceTimersByTime(100);
    expect(handler.mock.calls.length).toBeGreaterThanOrEqual(4);
    expect(handler.mock.calls.length).toBeLessThanOrEqual(6);
  });

  it('chunks contain the expected RMS energy (full-scale sine ≈ 0.707)', async () => {
    const pcm = generateSyntheticPcm({
      durationSec: 0.5, sampleRate: 16000, amplitude: 1.0, frequency: 1000,
    });
    loadPcmFixture(pcm, { chunkIntervalMs: 20, framesPerChunk: 320 });

    const captured: string[] = [];
    fakeMicSource.addListener((e) => captured.push(e.data));
    await fakeMicSource.startCapture(16000);

    jest.advanceTimersByTime(60);
    expect(captured.length).toBeGreaterThanOrEqual(2);

    const rms = computeRmsFromBase64Pcm16(captured[1]); // skip first (ramp-in artifact)
    expect(rms).toBeGreaterThan(0.6);
    expect(rms).toBeLessThan(0.8);
  });

  it('loops back to the start when fixture exhausts (loop=true)', async () => {
    // Tiny fixture — 1 chunk of audio (320 frames × 2 bytes = 640).
    const pcm = generateSyntheticPcm({
      durationSec: 320 / 16000, sampleRate: 16000, amplitude: 0.5, frequency: 0,
    });
    loadPcmFixture(pcm, { chunkIntervalMs: 20, framesPerChunk: 320, loop: true });

    const handler = jest.fn();
    fakeMicSource.addListener(handler);
    await fakeMicSource.startCapture(16000);

    jest.advanceTimersByTime(100); // > 1 fixture-length
    expect(handler.mock.calls.length).toBeGreaterThan(2); // would have stopped at 1 if no loop
  });

  it('stops emitting when stopCapture is called', async () => {
    const pcm = generateSyntheticPcm({
      durationSec: 1, sampleRate: 16000, amplitude: 0.5, frequency: 0,
    });
    loadPcmFixture(pcm);
    const handler = jest.fn();
    fakeMicSource.addListener(handler);
    await fakeMicSource.startCapture(16000);

    jest.advanceTimersByTime(40);
    const countBefore = handler.mock.calls.length;
    await fakeMicSource.stopCapture();
    jest.advanceTimersByTime(200);
    expect(handler.mock.calls.length).toBe(countBefore);
  });

  it('removes a listener cleanly', async () => {
    const pcm = generateSyntheticPcm({ durationSec: 0.5, sampleRate: 16000, amplitude: 0.5, frequency: 0 });
    loadPcmFixture(pcm);
    const handler = jest.fn();
    const sub = fakeMicSource.addListener(handler);
    await fakeMicSource.startCapture(16000);

    jest.advanceTimersByTime(40);
    sub.remove();
    const countBefore = handler.mock.calls.length;
    jest.advanceTimersByTime(100);
    expect(handler.mock.calls.length).toBe(countBefore);
  });
});
