import { create } from 'zustand';

/**
 * Real-time mic input level for the in-session VU meter.
 *
 * `level` is a smoothed RMS amplitude in [0, 1] where 1 is full-scale
 * 16-bit PCM. Updated ~per audio chunk by `audioLevelTracker`.
 *
 * `peakDb` is the smoothed level expressed in decibels (relative to
 * full scale). Useful for "is the gain too low?" diagnostics.
 *
 * `chunksReceived` increments on every chunk — confirms the mic is
 * delivering data at all (vs. silence vs. broken pipeline).
 */
export interface AudioLevelStore {
  level: number;
  peakDb: number;
  chunksReceived: number;
  isListening: boolean;
  setLevel: (level: number, peakDb: number) => void;
  incrementChunks: () => void;
  setListening: (listening: boolean) => void;
  reset: () => void;
}

export const useAudioLevelStore = create<AudioLevelStore>((set) => ({
  level: 0,
  peakDb: -Infinity,
  chunksReceived: 0,
  isListening: false,

  setLevel: (level, peakDb) => set({ level, peakDb }),
  incrementChunks: () => set((s) => ({ chunksReceived: s.chunksReceived + 1 })),
  setListening: (isListening) => set({ isListening }),
  reset: () => set({ level: 0, peakDb: -Infinity, chunksReceived: 0, isListening: false }),
}));
