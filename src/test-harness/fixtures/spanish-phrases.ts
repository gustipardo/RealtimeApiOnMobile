import type { AnkiCard } from "../../types/anki";

/**
 * Subset of the Spanish conversational phrases deck for replay tests.
 * Source: ./spanish-phrases.scenario.json (create-test-apkg.py — spanish-phrases profile).
 *
 * Selection: the first 7 cards. Fronts are common Spanish questions/answers;
 * backs are English translations. This deck is what BUG 16 (session 5) tested
 * — the user setting es-ES on the deck and the prompt emitting
 * "Language: Spanish ONLY" so the tutor speaks Spanish throughout.
 *
 * Note on cardId range: starts at 4001 to keep distinct from AWS (1001),
 * Anatomy (2001), and Refold English (3001).
 */
export const spanishPhrasesCards: AnkiCard[] = [
  {
    cardId: 4001,
    cardOrd: 0,
    front: "¿Cómo te llamas?",
    back: "What is your name?",
    deckName: "Engram Test — Spanish Phrases",
  },
  {
    cardId: 4002,
    cardOrd: 0,
    front: "¿Cuántos años tienes?",
    back: "How old are you?",
    deckName: "Engram Test — Spanish Phrases",
  },
  {
    cardId: 4003,
    cardOrd: 0,
    front: "¿De dónde eres?",
    back: "Where are you from?",
    deckName: "Engram Test — Spanish Phrases",
  },
  {
    cardId: 4004,
    cardOrd: 0,
    front: "¿Qué hora es?",
    back: "What time is it?",
    deckName: "Engram Test — Spanish Phrases",
  },
  {
    cardId: 4005,
    cardOrd: 0,
    front: "¿Puedes repetir, por favor?",
    back: "Can you repeat that, please?",
    deckName: "Engram Test — Spanish Phrases",
  },
  {
    cardId: 4006,
    cardOrd: 0,
    front: "Tengo hambre",
    back: "I am hungry",
    deckName: "Engram Test — Spanish Phrases",
  },
  {
    cardId: 4007,
    cardOrd: 0,
    front: "No entiendo",
    back: "I don't understand",
    deckName: "Engram Test — Spanish Phrases",
  },
];