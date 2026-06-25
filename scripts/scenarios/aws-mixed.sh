#!/usr/bin/env bash
# Scenario: AWS SA student — 3 correct, 1 incorrect, 1 correct
#
# Persona: developer studying for AWS, knows most but blanks on Lambda.
# Expected outcome: 4 correct write-backs (ease 4), 1 incorrect (ease 1).
#
# Why this exists: validates that the session handles mixed results correctly —
# the scheduler should apply ease 1 to the failed card (so it reappears soon)
# and ease 4 to the rest. Both write-back paths must return >0 rows updated.

SCENARIO_PROFILE="aws-sa"
SCENARIO_DECK="Engram Test — AWS SA"
SCENARIO_CARDS_TO_STUDY=5

SCENARIO_ANSWERS=(
    "EC2 stands for Elastic Compute Cloud, virtual servers in the cloud"
    "S3 is Simple Storage Service, used for object storage"
    "I am not sure, I think it has something to do with containers, I don't know"   # WRONG — Lambda
    "IAM stands for Identity and Access Management, it controls access to AWS resources"
    "An Availability Zone is an isolated data centre within a region"
)

SCENARIO_EXPECTED_CORRECT=4
SCENARIO_EXPECTED_INCORRECT=1
SCENARIO_EXPECTED_SKIPPED=0

SCENARIO_ANSWER_DELAY_S=12
SCENARIO_STEP7_TIMEOUT_S=45
