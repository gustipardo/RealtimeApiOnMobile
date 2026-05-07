jest.mock('expo-foreground-audio', () => ({
  __esModule: true,
  default: { addListener: jest.fn().mockReturnValue({ remove: jest.fn() }) },
}));

import { computeRmsFromBase64Pcm16, levelToDb } from '../audioLevelTracker';

/**
 * Generate a base64 PCM16 chunk from a flat numeric sample array.
 * Samples are clamped to int16 range and written little-endian.
 */
function pcm16ToBase64(samples: number[]): string {
  const buf = new Uint8Array(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    let s = Math.round(samples[i]);
    if (s > 32767) s = 32767;
    if (s < -32768) s = -32768;
    if (s < 0) s += 0x10000;
    buf[i * 2] = s & 0xff;
    buf[i * 2 + 1] = (s >> 8) & 0xff;
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Buffer } = require('buffer');
  return Buffer.from(buf).toString('base64');
}

describe('audioLevelTracker — RMS from base64 PCM16', () => {
  it('returns 0 for an empty chunk', () => {
    expect(computeRmsFromBase64Pcm16('')).toBe(0);
  });

  it('returns 0 for pure silence (all zero samples)', () => {
    const b64 = pcm16ToBase64(new Array(160).fill(0));
    expect(computeRmsFromBase64Pcm16(b64)).toBe(0);
  });

  it('returns ~1 for full-scale DC at +32767', () => {
    const b64 = pcm16ToBase64(new Array(160).fill(32767));
    const rms = computeRmsFromBase64Pcm16(b64);
    // 32767/32768 ≈ 0.99997
    expect(rms).toBeGreaterThan(0.99);
    expect(rms).toBeLessThanOrEqual(1.0);
  });

  it('returns ~1 for full-scale DC at -32768 (sign-extension correct)', () => {
    const b64 = pcm16ToBase64(new Array(160).fill(-32768));
    const rms = computeRmsFromBase64Pcm16(b64);
    expect(rms).toBeGreaterThan(0.99);
    expect(rms).toBeLessThanOrEqual(1.0);
  });

  it('returns ~0.707 for a full-scale sine wave', () => {
    const N = 1600; // 100 cycles at sample rate doesn't matter for RMS
    const samples: number[] = [];
    for (let i = 0; i < N; i++) {
      samples.push(Math.sin((2 * Math.PI * i) / 16) * 32767);
    }
    const b64 = pcm16ToBase64(samples);
    const rms = computeRmsFromBase64Pcm16(b64);
    // RMS of sin(x) over a full period is 1/sqrt(2) ≈ 0.7071
    expect(rms).toBeGreaterThan(0.69);
    expect(rms).toBeLessThan(0.72);
  });

  it('scales linearly with amplitude (half amplitude → half RMS)', () => {
    const sineFull: number[] = [];
    const sineHalf: number[] = [];
    for (let i = 0; i < 1600; i++) {
      const v = Math.sin((2 * Math.PI * i) / 16);
      sineFull.push(v * 32767);
      sineHalf.push(v * 16383);
    }
    const rmsFull = computeRmsFromBase64Pcm16(pcm16ToBase64(sineFull));
    const rmsHalf = computeRmsFromBase64Pcm16(pcm16ToBase64(sineHalf));
    expect(rmsHalf).toBeCloseTo(rmsFull / 2, 2);
  });
});

describe('audioLevelTracker — levelToDb', () => {
  it('returns 0 dB for full-scale (level = 1)', () => {
    expect(levelToDb(1)).toBeCloseTo(0, 5);
  });

  it('returns -6 dB for half-scale (level = 0.5)', () => {
    expect(levelToDb(0.5)).toBeCloseTo(-6.02, 1);
  });

  it('returns -Infinity for level 0', () => {
    expect(levelToDb(0)).toBe(-Infinity);
  });
});
