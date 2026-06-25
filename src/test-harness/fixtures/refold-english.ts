import type { AnkiCard } from "../../types/anki";

/**
 * Subset of the Refold English vocab deck for replay tests.
 * Source: ./refold-english.scenario.json (create-test-apkg.py — refold-english profile).
 *
 * Selection: the first 10 cards. Each front is a single English word;
 * the back is a short definition + example sentence.
 *
 * Note on cardId range: starts at 3001 to keep distinct from AWS (1001)
 * and Anatomy (2001). When writing assertions in tests, don't hardcode
 * cardIds — read them off the fixture's exported cards instead.
 */
export const refoldEnglishCards: AnkiCard[] = [
  {
    cardId: 3001,
    cardOrd: 0,
    front: "grasp",
    back: "to hold firmly; to understand\nEx: She grasped the concept quickly.",
    deckName: "Engram Test — Refold English",
  },
  {
    cardId: 3002,
    cardOrd: 0,
    front: "subtle",
    back: "so slight as to be hard to notice\nEx: There was a subtle difference in tone.",
    deckName: "Engram Test — Refold English",
  },
  {
    cardId: 3003,
    cardOrd: 0,
    front: "persist",
    back: "to continue doing something despite difficulty\nEx: He persisted despite the obstacles.",
    deckName: "Engram Test — Refold English",
  },
  {
    cardId: 3004,
    cardOrd: 0,
    front: "leverage",
    back: "to use something to maximum advantage\nEx: She leveraged her contacts to land the job.",
    deckName: "Engram Test — Refold English",
  },
  {
    cardId: 3005,
    cardOrd: 0,
    front: "arbitrary",
    back: "based on random choice rather than reason\nEx: The rule seemed completely arbitrary.",
    deckName: "Engram Test — Refold English",
  },
  {
    cardId: 3006,
    cardOrd: 0,
    front: "coherent",
    back: "logical and consistent; easy to understand\nEx: His argument was coherent and well-structured.",
    deckName: "Engram Test — Refold English",
  },
  {
    cardId: 3007,
    cardOrd: 0,
    front: "ambiguous",
    back: "having more than one possible meaning\nEx: His answer was deliberately ambiguous.",
    deckName: "Engram Test — Refold English",
  },
  {
    cardId: 3008,
    cardOrd: 0,
    front: "concise",
    back: "giving a lot of information clearly in a few words\nEx: Write a concise summary.",
    deckName: "Engram Test — Refold English",
  },
  {
    cardId: 3009,
    cardOrd: 0,
    front: "implicit",
    back: "implied but not directly expressed\nEx: There was an implicit agreement between them.",
    deckName: "Engram Test — Refold English",
  },
  {
    cardId: 3010,
    cardOrd: 0,
    front: "threshold",
    back: "the level at which something begins or changes\nEx: We crossed the pain threshold.",
    deckName: "Engram Test — Refold English",
  },
];