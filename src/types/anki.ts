export interface AnkiCard {
  cardId: number;
  cardOrd: number; // AnkiDroid `ord` from schedule cursor — required for write-back
  front: string; // HTML stripped by cleanAnkiText before use
  back: string;
  deckName: string;
}

export interface DeckInfo {
  deckName: string;
  dueCount: number;
  newCount: number;
  learnCount: number;
  reviewCount: number;
}

export interface BridgeError {
  code: 'ANKIDROID_NOT_INSTALLED' | 'PERMISSION_DENIED' | 'NO_DECKS' | 'QUERY_FAILED';
  message: string;
}
