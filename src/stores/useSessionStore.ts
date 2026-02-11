import { create } from 'zustand';
import type { SessionPhase, SessionStats } from '../types/session';

export interface SessionStore {
  phase: SessionPhase;
  currentCardIndex: number;
  stats: SessionStats;
  transitionTo: (phase: SessionPhase, trigger: string) => void;
  recordAnswer: (evaluation: 'correct' | 'incorrect') => void;
  advanceCard: () => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  phase: 'idle',
  currentCardIndex: 0,
  stats: { correct: 0, incorrect: 0 },

  transitionTo: (phase, _trigger) => set({ phase }),

  recordAnswer: (evaluation) =>
    set((state) => ({
      stats: {
        correct: state.stats.correct + (evaluation === 'correct' ? 1 : 0),
        incorrect: state.stats.incorrect + (evaluation === 'incorrect' ? 1 : 0),
      },
    })),

  advanceCard: () =>
    set((state) => ({ currentCardIndex: state.currentCardIndex + 1 })),

  resetSession: () =>
    set({ phase: 'idle', currentCardIndex: 0, stats: { correct: 0, incorrect: 0 } }),
}));
