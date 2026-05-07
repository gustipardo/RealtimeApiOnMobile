import type { AnkiCard } from '../types/anki';

/**
 * In-memory replacement for the AnkiDroid-backed cardLoader during tests.
 * Tracks the same notion of "current index" that useCardCacheStore would,
 * so the mocked cardLoader functions can delegate here.
 */
export class DeckSimulator {
  private idx = 0;

  constructor(public cards: AnkiCard[]) {}

  reset(cards: AnkiCard[]): void {
    this.cards = cards;
    this.idx = 0;
  }

  getCurrent(): AnkiCard | undefined {
    return this.cards[this.idx];
  }

  peekNext(): AnkiCard | undefined {
    return this.cards[this.idx + 1];
  }

  peekRemainingAfterAdvance(): number {
    return Math.max(0, this.cards.length - (this.idx + 1));
  }

  remaining(): number {
    return Math.max(0, this.cards.length - this.idx);
  }

  total(): number {
    return this.cards.length;
  }

  advance(): void {
    if (this.idx + 1 < this.cards.length) {
      this.idx++;
    }
  }

  currentIndex(): number {
    return this.idx;
  }
}

export const deckSimulator = new DeckSimulator([]);
