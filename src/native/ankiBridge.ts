import AnkiDroidModule from 'anki-droid';
import type { AnkiCard, BridgeError } from '../types/anki';

/**
 * Typed wrapper for the AnkiDroid native module.
 * Provides a clean API for interacting with AnkiDroid ContentProvider.
 */
export const ankiBridge = {
  /**
   * Check if AnkiDroid is installed on the device.
   * Uses Android PackageManager to check for com.ichi2.anki package.
   * @returns Promise resolving to true if AnkiDroid is installed
   */
  async isInstalled(): Promise<boolean> {
    try {
      return await AnkiDroidModule.isInstalled();
    } catch (error) {
      console.error('[ankiBridge] isInstalled error:', error);
      return false;
    }
  },

  /**
   * Get list of deck names from AnkiDroid.
   * Queries the AnkiDroid ContentProvider for available decks.
   * @returns Promise resolving to array of deck names
   * @throws BridgeError if query fails
   */
  async getDeckNames(): Promise<string[]> {
    try {
      return await AnkiDroidModule.getDeckNames();
    } catch (error) {
      throw createBridgeError('QUERY_FAILED', `Failed to get deck names: ${error}`);
    }
  },

  /**
   * Get due cards for a specific deck.
   * Queries AnkiDroid for cards that are due for review.
   * @param deckName Name of the deck to query
   * @returns Promise resolving to array of AnkiCard objects
   * @throws BridgeError if query fails
   */
  async getDueCards(deckName: string): Promise<AnkiCard[]> {
    try {
      const rawCards = await AnkiDroidModule.getDueCards(deckName);
      return rawCards.map((card) => ({
        cardId: card.cardId,
        front: card.front,
        back: card.back,
        deckName: card.deckName,
      }));
    } catch (error) {
      throw createBridgeError('QUERY_FAILED', `Failed to get due cards: ${error}`);
    }
  },

  /**
   * Trigger AnkiDroid to sync with AnkiWeb.
   * Sends a broadcast intent to AnkiDroid to initiate sync.
   * @returns Promise that resolves when sync is triggered
   * @throws BridgeError if sync trigger fails
   */
  async triggerSync(): Promise<void> {
    try {
      await AnkiDroidModule.triggerSync();
    } catch (error) {
      throw createBridgeError('QUERY_FAILED', `Failed to trigger sync: ${error}`);
    }
  },
};

/**
 * Helper to create typed BridgeError objects
 */
function createBridgeError(
  code: BridgeError['code'],
  message: string
): BridgeError {
  return { code, message };
}

export default ankiBridge;
