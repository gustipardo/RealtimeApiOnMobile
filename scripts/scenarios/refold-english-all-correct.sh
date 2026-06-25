#!/usr/bin/env bash
# Scenario: Refold English student — all correct, 6 cards
#
# Persona: intermediate English learner reviewing vocabulary with Refold method.
# Studies 6 cards from a 1000-word English deck, knows every word.
# Expected outcome: 6 correct write-backs (ease 4), 0 incorrect.
#
# Why this exists: validates that the session works correctly for a
# vocabulary-style deck (single word on front, definition on back) —
# a different structure from Q&A decks like aws-sa.

SCENARIO_PROFILE="refold-english"
SCENARIO_DECK="Engram Test — Refold English"
SCENARIO_CARDS_TO_STUDY=6

SCENARIO_ANSWERS=(
    "Grasp means to hold firmly or to understand something deeply"
    "Subtle means something so slight or delicate it is hard to notice"
    "Persist means to keep doing something even when it is difficult or challenging"
    "Leverage means to use something to your maximum advantage"
    "Arbitrary means based on random choice rather than any clear reason or logic"
    "Coherent means logical and consistent and easy to understand"
)

SCENARIO_EXPECTED_CORRECT=6
SCENARIO_EXPECTED_INCORRECT=0
SCENARIO_EXPECTED_SKIPPED=0

SCENARIO_ANSWER_DELAY_S=10
SCENARIO_STEP7_TIMEOUT_S=40
