#!/usr/bin/env bash
# Scenario: AWS SA student — all correct answers
#
# Persona: developer studying for the AWS Solutions Architect exam.
# Studies 5 cards, knows every answer confidently.
# Expected outcome: 5 correct write-backs (ease 4), 0 incorrect.
#
# Why this exists: validates the happy path — session starts, tutor asks,
# user answers correctly each time, scheduler advances the card with a
# good ease rating, session completes with 5/5 cards reviewed.

SCENARIO_PROFILE="aws-sa"
SCENARIO_DECK="Engram Test — AWS SA"
SCENARIO_CARDS_TO_STUDY=5

# Injected answers — index-matched to the deck's card order.
# These are plausible correct answers a real student would say.
# Gemini evaluates them; we expect it to call evaluate_and_move_next
# with quality="correct" for each one.
SCENARIO_ANSWERS=(
    "EC2 stands for Elastic Compute Cloud, virtual servers in the cloud"
    "S3 is Simple Storage Service, used for object storage"
    "Lambda is serverless compute, you run code without managing servers"
    "IAM stands for Identity and Access Management, it controls access to AWS resources"
    "An Availability Zone is an isolated data centre within a region, they provide fault tolerance"
)

# Expected outcomes — what the assertion tool checks in the session log.
SCENARIO_EXPECTED_CORRECT=5
SCENARIO_EXPECTED_INCORRECT=0
SCENARIO_EXPECTED_SKIPPED=0

# Timing — how long to wait for the tutor to finish before injecting next answer.
SCENARIO_ANSWER_DELAY_S=12   # seconds after injection before next answer
SCENARIO_STEP7_TIMEOUT_S=45  # seconds to wait for session to reach STEP 7
