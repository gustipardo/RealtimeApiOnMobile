#!/usr/bin/env bash
# assert-session.sh — Parse a captured session log and validate expected outcomes.
#
# Reads the structured log emitted by sessionDebugLogger.ts and checks:
#   - How many cards were graded correct / incorrect / skipped
#   - How many write-backs were accepted by AnkiDroid (>0 rows updated)
#   - That the session completed (STEP 8 or session_complete marker)
#   - (Optional) That no phase entered the error state
#
# Usage:
#   scripts/assert-session.sh --log <log-file> \
#       [--expect-correct N] [--expect-incorrect N] [--expect-skipped N] \
#       [--expect-complete] [--strict]
#
# Exit codes:
#   0  All assertions passed
#   1  One or more assertions failed
#   2  Log file not found or empty

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "${GREEN}  ✓${RESET}  $*"; }
fail() { echo -e "${RED}  ✗${RESET}  $*"; FAILURES=$((FAILURES + 1)); }
warn() { echo -e "${YELLOW}  ⚠${RESET}  $*"; }
info() { echo -e "${CYAN}  →${RESET}  $*"; }

FAILURES=0
LOG_FILE=""
EXPECT_CORRECT=""
EXPECT_INCORRECT=""
EXPECT_SKIPPED=""
EXPECT_COMPLETE=false
STRICT=false   # fail on any error-phase transition

# ── Arg parsing ──────────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case "$1" in
        --log)               LOG_FILE="$2";         shift 2 ;;
        --expect-correct)    EXPECT_CORRECT="$2";   shift 2 ;;
        --expect-incorrect)  EXPECT_INCORRECT="$2"; shift 2 ;;
        --expect-skipped)    EXPECT_SKIPPED="$2";   shift 2 ;;
        --expect-complete)   EXPECT_COMPLETE=true;  shift   ;;
        --strict)            STRICT=true;           shift   ;;
        *) echo "Unknown arg: $1"; exit 1 ;;
    esac
done

[[ -z "$LOG_FILE" ]] && { echo "Usage: assert-session.sh --log <file> [options]"; exit 1; }
[[ ! -f "$LOG_FILE" ]] && { echo "Log not found: $LOG_FILE"; exit 2; }
[[ ! -s "$LOG_FILE" ]] && { echo "Log is empty: $LOG_FILE"; exit 2; }

echo ""
echo -e "${BOLD}Session assertion — $(basename "$LOG_FILE")${RESET}"
echo "───────────────────────────────────────────────"

# ── Extract counts from the log ──────────────────────────────────────────────

# Grading counts are read from the tool-call ARGUMENT string
# `user_response_quality":"<value>"`, which is logged exactly ONCE per
# evaluate_and_move_next call. The earlier heuristic (`quality.*correct` /
# `"correct"`) over-counted badly: it matched the word inside feedback text and
# prompt echoes, and `*correct` even matched the substring inside "incorrect".
# That looseness produced false PASSes that masked early session termination
# (e.g. BUG 10 truncating a run after a skip). Anchoring on the arg string makes
# the count exactly the number of gradings of each kind.
#
# There is NO separate `skip` tool — a skip is the "skipped" quality value of
# evaluate_and_move_next (src/config/prompts.ts enum ['correct','incorrect','skipped']).
ACTUAL_CORRECT=$(grep -c 'user_response_quality":"correct"'   "$LOG_FILE" 2>/dev/null || true)
ACTUAL_INCORRECT=$(grep -c 'user_response_quality":"incorrect"' "$LOG_FILE" 2>/dev/null || true)
ACTUAL_SKIPPED=$(grep -c 'user_response_quality":"skipped"'   "$LOG_FILE" 2>/dev/null || true)

# Write-backs accepted by AnkiDroid (rows > 0)
# NOTE: trailing `|| true` keeps the substitution alive under `set -o pipefail`.
# When the inner grep matches nothing (e.g. no rejected write-backs — the happy
# path), it exits 1, which pipefail would otherwise propagate and `set -e` would
# treat as fatal, aborting the script right before it prints any results.
WRITEBACK_OK=$( { grep 'row(s) updated\|rows updated' "$LOG_FILE" 2>/dev/null \
    | grep -v ' 0 row' | wc -l | tr -d ' '; } || true )

# Write-backs rejected (0 rows)
WRITEBACK_ZERO=$( { grep 'row(s) updated\|rows updated' "$LOG_FILE" 2>/dev/null \
    | grep ' 0 row' | wc -l | tr -d ' '; } || true )

# Phase errors
ERROR_PHASES=$(grep -c "→ error\|phase.*error" "$LOG_FILE" 2>/dev/null || true)

# Session complete marker
SESSION_COMPLETE=$(grep -c "STEP 8\|session_complete\|no_more_cards\|Session ended" \
    "$LOG_FILE" 2>/dev/null || true)

# ── Print observed values ─────────────────────────────────────────────────────

echo ""
info "Observed:"
echo "    Correct answers         : $ACTUAL_CORRECT"
echo "    Incorrect answers       : $ACTUAL_INCORRECT"
echo "    Skipped                 : $ACTUAL_SKIPPED"
echo "    Write-backs accepted    : $WRITEBACK_OK"
echo "    Write-backs rejected    : $WRITEBACK_ZERO"
echo "    Error phase transitions : $ERROR_PHASES"
echo "    Session complete marker : $SESSION_COMPLETE"
echo ""

# ── Assertions ────────────────────────────────────────────────────────────────

info "Assertions:"

if [[ -n "$EXPECT_CORRECT" ]]; then
    if [[ "$ACTUAL_CORRECT" -ge "$EXPECT_CORRECT" ]]; then
        ok "Correct answers: $ACTUAL_CORRECT (expected ≥ $EXPECT_CORRECT)"
    else
        fail "Correct answers: got $ACTUAL_CORRECT, expected ≥ $EXPECT_CORRECT"
    fi
fi

if [[ -n "$EXPECT_INCORRECT" ]]; then
    if [[ "$ACTUAL_INCORRECT" -ge "$EXPECT_INCORRECT" ]]; then
        ok "Incorrect answers: $ACTUAL_INCORRECT (expected ≥ $EXPECT_INCORRECT)"
    else
        fail "Incorrect answers: got $ACTUAL_INCORRECT, expected ≥ $EXPECT_INCORRECT"
    fi
fi

if [[ -n "$EXPECT_SKIPPED" ]]; then
    if [[ "$ACTUAL_SKIPPED" -ge "$EXPECT_SKIPPED" ]]; then
        ok "Skipped: $ACTUAL_SKIPPED (expected ≥ $EXPECT_SKIPPED)"
    else
        fail "Skipped: got $ACTUAL_SKIPPED, expected ≥ $EXPECT_SKIPPED"
    fi
fi

if [[ "$WRITEBACK_ZERO" -gt 0 ]]; then
    fail "$WRITEBACK_ZERO write-back(s) returned 0 rows — AnkiDroid rejected the answer"
else
    ok "All write-backs accepted (0 rejected)"
fi

if $STRICT && [[ "$ERROR_PHASES" -gt 0 ]]; then
    fail "Session entered error phase $ERROR_PHASES time(s) (--strict mode)"
elif [[ "$ERROR_PHASES" -gt 0 ]]; then
    warn "Session entered error phase $ERROR_PHASES time(s)"
else
    ok "No error phase transitions"
fi

if $EXPECT_COMPLETE; then
    if [[ "$SESSION_COMPLETE" -gt 0 ]]; then
        ok "Session completed (STEP 8 / session_complete reached)"
    else
        fail "Session did NOT complete (no STEP 8 or session_complete in log)"
    fi
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "───────────────────────────────────────────────"

if [[ "$FAILURES" -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}PASSED${RESET}  All ${#} assertions passed."
    exit 0
else
    echo -e "${RED}${BOLD}FAILED${RESET}  $FAILURES assertion(s) failed."
    exit 1
fi
