import { ankiBridge } from '../native/ankiBridge';
import { useCardCacheStore } from '../stores/useCardCacheStore';
import { useSessionStore } from '../stores/useSessionStore';
import type { AnkiCard } from '../types/anki';

/**
 * Load due cards from AnkiDroid into the card cache.
 * Returns the loaded cards for immediate use.
 */
export async function loadDueCards(deckName: string): Promise<AnkiCard[]> {
  const { transitionTo } = useSessionStore.getState();
  const { setCards } = useCardCacheStore.getState();

  transitionTo('loading_cards', 'loadDueCards');

  try {
    const cards = await ankiBridge.getDueCards(deckName);

    if (cards.length === 0) {
      console.log('[CardLoader] No due cards found');
      return [];
    }

    setCards(cards);
    console.log(`[CardLoader] Loaded ${cards.length} due cards`);
    return cards;
  } catch (error) {
    console.error('[CardLoader] Failed to load cards:', error);
    throw error;
  }
}

/**
 * Get the current card from cache.
 */
export function getCurrentCard(): AnkiCard | undefined {
  return useCardCacheStore.getState().getCurrentCard();
}

/**
 * Advance to the next card and return it.
 * Returns undefined if no more cards.
 */
export function getNextCard(): AnkiCard | undefined {
  return useCardCacheStore.getState().getNextCard();
}

/**
 * Get remaining card count.
 */
export function getRemainingCardCount(): number {
  const { cards, currentIndex } = useCardCacheStore.getState();
  return Math.max(0, cards.length - currentIndex);
}

/**
 * Get total card count.
 */
export function getTotalCardCount(): number {
  return useCardCacheStore.getState().cards.length;
}

/**
 * Clear the card cache.
 */
export function clearCards(): void {
  useCardCacheStore.getState().clear();
}
