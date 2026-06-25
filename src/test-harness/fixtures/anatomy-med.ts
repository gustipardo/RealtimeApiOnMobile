import type { AnkiCard } from "../../types/anki";

/**
 * Subset of the Anatomy/Physiology deck for replay tests.
 * Source: ./anatomy-med.scenario.json (create-test-apkg.py — anatomy-med profile).
 *
 * Selection: the first 6 cards. Each is a short clinical Q with a single-line
 * answer that a careful AI grader can match in one shot.
 */
export const anatomyMedCards: AnkiCard[] = [
  {
    cardId: 2001,
    cardOrd: 0,
    front: "What does the mitochondria do?",
    back: "Produces ATP through cellular respiration — the powerhouse of the cell",
    deckName: "Engram Test — Anatomy",
  },
  {
    cardId: 2002,
    cardOrd: 0,
    front: "What is the function of the hippocampus?",
    back: "Memory consolidation and spatial navigation",
    deckName: "Engram Test — Anatomy",
  },
  {
    cardId: 2003,
    cardOrd: 0,
    front: "What does the pancreas secrete?",
    back: "Insulin and glucagon (endocrine); digestive enzymes (exocrine)",
    deckName: "Engram Test — Anatomy",
  },
  {
    cardId: 2004,
    cardOrd: 0,
    front: "Where is the brachial plexus located?",
    back: "Network of nerves from C5-T1, running through the neck and armpit",
    deckName: "Engram Test — Anatomy",
  },
  {
    cardId: 2005,
    cardOrd: 0,
    front: "What is the role of the sinoatrial node?",
    back: "The heart's natural pacemaker — generates the electrical impulse that starts each heartbeat",
    deckName: "Engram Test — Anatomy",
  },
  {
    cardId: 2006,
    cardOrd: 0,
    front: "What does the thyroid gland regulate?",
    back: "Metabolism, heart rate, and body temperature via T3/T4 hormones",
    deckName: "Engram Test — Anatomy",
  },
];