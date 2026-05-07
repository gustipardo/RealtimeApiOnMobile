import { create } from 'zustand';
import type { AnkiCard } from '../types/anki';

export interface CardCacheStore {
  cards: AnkiCard[];
  currentIndex: number;
  setCards: (cards: AnkiCard[]) => void;
  appendCards: (cards: AnkiCard[]) => number; // returns count actually appended (after dedupe)
  getCurrentCard: () => AnkiCard | undefined;
  getNextCard: () => AnkiCard | undefined;
  clear: () => void;
}

export const useCardCacheStore = create<CardCacheStore>((set, get) => ({
  cards: [],
  currentIndex: 0,

  setCards: (cards) => set({ cards, currentIndex: 0 }),

  appendCards: (incoming) => {
    const { cards } = get();
    const seen = new Set(cards.map((c) => c.cardId));
    const fresh = incoming.filter((c) => !seen.has(c.cardId));
    if (fresh.length === 0) return 0;
    set({ cards: [...cards, ...fresh] });
    return fresh.length;
  },

  getCurrentCard: () => {
    const { cards, currentIndex } = get();
    return cards[currentIndex];
  },

  getNextCard: () => {
    const { cards, currentIndex } = get();
    const nextIndex = currentIndex + 1;
    if (nextIndex < cards.length) {
      set({ currentIndex: nextIndex });
      return cards[nextIndex];
    }
    return undefined;
  },

  clear: () => set({ cards: [], currentIndex: 0 }),
}));
