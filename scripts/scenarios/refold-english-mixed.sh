#!/usr/bin/env bash
# Scenario: Refold English student — 2 correct, 1 blank, 2 correct, 1 incorrect
#
# Persona: beginner English learner who knows common words but struggles with
# academic vocabulary ("implicit", "threshold"). Also completely blanks on
# "arbitrary" and asks to skip it.
# Expected outcome: 4 correct, 1 incorrect, 1 skipped.
#
# Why this exists: validates that skip handling works alongside write-backs —
# skipped cards should not produce a write-back, only evaluated ones do.

SCENARIO_PROFILE="refold-english"
SCENARIO_DECK="Engram Test — Refold English"
SCENARIO_CARDS_TO_STUDY=6

SCENARIO_ANSWERS=(
    "Grasp means to hold or understand something"
    "Subtle means something very small or difficult to notice"
    "skip this one please, I have no idea"             # SKIP
    "Leverage means using something to your advantage"
    "I don't know, arbitrary, I am not sure"           # WRONG
    "Coherent means clear and logical"
)

SCENARIO_EXPECTED_CORRECT=4
SCENARIO_EXPECTED_INCORRECT=1
SCENARIO_EXPECTED_SKIPPED=1

SCENARIO_ANSWER_DELAY_S=10
SCENARIO_STEP7_TIMEOUT_S=40
