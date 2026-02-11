import { create } from 'zustand';
import type { SessionPhase, SessionStats } from '../types/session';

export interface SessionStore {
  phase: SessionPhase;
  currentCardIndex: number;
  stats: SessionStats;
  lastEvaluation: 'correct' | 'incorrect' | null;
  transitionTo: (phase: SessionPhase, trigger: string) => void;
  recordAnswer: (evaluation: 'correct' | 'incorrect') => void;
  advanceCard: () => void;
  resetSession: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  phase: 'idle',
  currentCardIndex: 0,
  stats: { correct: 0, incorrect: 0 },
  lastEvaluation: null,

  transitionTo: (phase, _trigger) => set({ phase }),

  recordAnswer: (evaluation) =>
    set((state) => ({
      stats: {
        correct: state.stats.correct + (evaluation === 'correct' ? 1 : 0),
        incorrect: state.stats.incorrect + (evaluation === 'incorrect' ? 1 : 0),
      },
      lastEvaluation: evaluation,
    })),

  advanceCard: () =>
    set((state) => ({ currentCardIndex: state.currentCardIndex + 1, lastEvaluation: null })),

  resetSession: () =>
    set({ phase: 'idle', currentCardIndex: 0, stats: { correct: 0, incorrect: 0 }, lastEvaluation: null }),
}));
