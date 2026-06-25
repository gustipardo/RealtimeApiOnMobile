#!/usr/bin/env bash
# Scenario: Medical student — all correct, 6 anatomy cards
#
# Persona: pre-med student reviewing physiology with strong recall.
# Studies 6 anatomy cards and answers every one confidently.
# Expected outcome: 6 correct write-backs (ease 4), 0 incorrect.
#
# Why this exists: validates a domain-expert persona (dense scientific answers)
# to confirm the AI grades long, technical responses as correct when accurate.

SCENARIO_PROFILE="anatomy-med"
SCENARIO_DECK="Engram Test — Anatomy"
SCENARIO_CARDS_TO_STUDY=6

SCENARIO_ANSWERS=(
    "The mitochondria produces ATP through cellular respiration, it is the powerhouse of the cell"
    "The hippocampus is responsible for memory consolidation and spatial navigation"
    "The pancreas secretes insulin and glucagon as endocrine functions, and digestive enzymes as exocrine functions"
    "The brachial plexus is a network of nerves originating from C5 to T1, located in the neck and armpit region"
    "The sinoatrial node is the natural pacemaker of the heart, it generates the electrical impulse that starts each heartbeat"
    "The thyroid gland regulates metabolism, heart rate, and body temperature through T3 and T4 hormones"
)

SCENARIO_EXPECTED_CORRECT=6
SCENARIO_EXPECTED_INCORRECT=0
SCENARIO_EXPECTED_SKIPPED=0

SCENARIO_ANSWER_DELAY_S=14   # longer — medical answers are verbose, tutor takes time
SCENARIO_STEP7_TIMEOUT_S=45
