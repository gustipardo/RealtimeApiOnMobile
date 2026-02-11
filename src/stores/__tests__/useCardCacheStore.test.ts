import { useCardCacheStore } from '../useCardCacheStore';
import type { AnkiCard } from '../../types/anki';

const mockCards: AnkiCard[] = [
  { cardId: 1, front: 'What is React?', back: 'A JS library', deckName: 'Dev' },
  { cardId: 2, front: 'What is TypeScript?', back: 'Typed JS', deckName: 'Dev' },
  { cardId: 3, front: 'What is Zustand?', back: 'State management', deckName: 'Dev' },
];

beforeEach(() => {
  useCardCacheStore.getState().clear();
});

describe('useCardCacheStore', () => {
  describe('initial state', () => {
    it('starts with empty cards', () => {
      expect(useCardCacheStore.getState().cards).toEqual([]);
    });

    it('starts with currentIndex 0', () => {
      expect(useCardCacheStore.getState().currentIndex).toBe(0);
    });
  });

  describe('setCards', () => {
    it('populates cards and resets index', () => {
      useCardCacheStore.getState().setCards(mockCards);
      expect(useCardCacheStore.getState().cards).toEqual(mockCards);
      expect(useCardCacheStore.getState().currentIndex).toBe(0);
    });

    it('replaces existing cards', () => {
      useCardCacheStore.getState().setCards(mockCards);
      const newCards = [mockCards[0]];
      useCardCacheStore.getState().setCards(newCards);
      expect(useCardCacheStore.getState().cards).toEqual(newCards);
      expect(useCardCacheStore.getState().currentIndex).toBe(0);
    });
  });

  describe('getCurrentCard', () => {
    it('returns first card after setCards', () => {
      useCardCacheStore.getState().setCards(mockCards);
      expect(useCardCacheStore.getState().getCurrentCard()).toEqual(mockCards[0]);
    });

    it('returns undefined when no cards', () => {
      expect(useCardCacheStore.getState().getCurrentCard()).toBeUndefined();
    });
  });

  describe('getNextCard', () => {
    it('advances to next card and returns it', () => {
      useCardCacheStore.getState().setCards(mockCards);
      const next = useCardCacheStore.getState().getNextCard();
      expect(next).toEqual(mockCards[1]);
      expect(useCardCacheStore.getState().currentIndex).toBe(1);
    });

    it('returns undefined when at end of cards', () => {
      useCardCacheStore.getState().setCards([mockCards[0]]);
      const next = useCardCacheStore.getState().getNextCard();
      expect(next).toBeUndefined();
    });

    it('advances through all cards sequentially', () => {
      useCardCacheStore.getState().setCards(mockCards);
      expect(useCardCacheStore.getState().getCurrentCard()).toEqual(mockCards[0]);

      expect(useCardCacheStore.getState().getNextCard()).toEqual(mockCards[1]);
      expect(useCardCacheStore.getState().getNextCard()).toEqual(mockCards[2]);
      expect(useCardCacheStore.getState().getNextCard()).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('empties cards and resets index', () => {
      useCardCacheStore.getState().setCards(mockCards);
      useCardCacheStore.getState().getNextCard();

      useCardCacheStore.getState().clear();

      expect(useCardCacheStore.getState().cards).toEqual([]);
      expect(useCardCacheStore.getState().currentIndex).toBe(0);
    });
  });
});
