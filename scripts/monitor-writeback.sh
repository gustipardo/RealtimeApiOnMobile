#!/usr/bin/env bash
# monitor-writeback.sh — Verify that AnkiDroid's scheduler accepted a card
# answer from Engram.  Three modes:
#
#   --logcat        Parse a captured log file for AnkiDroidModule write-back
#                   markers. Useful after running a real voice session.
#
#   --instrumented  Run WriteBackTest.kt via Gradle connectedAndroidTest.
#                   Requires the device/emulator to have AnkiDroid installed
#                   and the test deck imported (see setup-test-emulator.sh).
#
#   --live          Stream live logcat from the attached device, highlighting
#                   write-back events as they happen during a voice session.
#
# Usage:
#   scripts/monitor-writeback.sh --live
#   scripts/monitor-writeback.sh --logcat _debug/runs/20260625-120000.log
#   scripts/monitor-writeback.sh --instrumented [--test=answerCard_correct_returnsNonZeroRows]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/_device.sh"  # sets ANDROID_SERIAL to the preferred device

MODE="${1:-}"
shift || true

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RESET='\033[0m'
ok()   { echo -e "${GREEN}[OK]${RESET}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $*"; }
fail() { echo -e "${RED}[FAIL]${RESET} $*"; }

# ── --logcat <file> ───────────────────────────────────────────────────────────

if [ "$MODE" = "--logcat" ]; then
  LOG_FILE="${1:-}"
  [ -z "$LOG_FILE" ] && { echo "Usage: $0 --logcat <log-file>"; exit 1; }
  [ ! -f "$LOG_FILE" ] && { fail "Log file not found: $LOG_FILE"; exit 1; }

  echo "Analysing write-back events in: $LOG_FILE"
  echo "─────────────────────────────────────────"

  # JS-layer: fire-and-forget call
  JS_CALLS=$(grep -c "answerCard.*ease=" "$LOG_FILE" 2>/dev/null || true)
  echo "  JS answerCard calls found : $JS_CALLS"

  # Kotlin-layer: priming query
  PRIMING=$(grep -c "setSelectedDeck\|priming query" "$LOG_FILE" 2>/dev/null || true)
  echo "  Kotlin priming queries    : $PRIMING"

  # Kotlin-layer: scheduler rows updated
  ROWS_LINES=$(grep "row(s) updated\|AnkiDroidModule.*answer" "$LOG_FILE" 2>/dev/null || true)
  ROWS_OK=$(echo "$ROWS_LINES" | grep -v " 0 row" | wc -l | tr -d ' ')
  ROWS_ZERO=$(echo "$ROWS_LINES" | grep " 0 row" | wc -l | tr -d ' ')

  echo "  Scheduler accepted (>0)   : $ROWS_OK"
  echo "  Scheduler rejected (=0)   : $ROWS_ZERO"

  echo ""
  if [ "$ROWS_ZERO" -gt 0 ]; then
    fail "Some answers were REJECTED by AnkiDroid (0 rows updated)."
    echo "  Lines:"
    echo "$ROWS_LINES" | grep " 0 row" | sed 's/^/    /'
    exit 1
  elif [ "$ROWS_OK" -gt 0 ]; then
    ok "All captured write-backs were accepted by AnkiDroid."
  else
    warn "No scheduler update lines found. Check that the deck was studied or try --live."
  fi
  exit 0
fi

# ── --live ────────────────────────────────────────────────────────────────────

if [ "$MODE" = "--live" ]; then
  echo "Streaming live write-back events (Ctrl+C to stop)…"
  echo "─────────────────────────────────────────────────"
  adb -s "$ANDROID_SERIAL" logcat -c  # clear old buffer
  adb -s "$ANDROID_SERIAL" logcat \
    AnkiDroidQueries:D AnkiDroidModule:D ReactNativeJS:I "*:S" \
  | while IFS= read -r line; do
      if echo "$line" | grep -q "row(s) updated"; then
        rows=$(echo "$line" | grep -oP '\d+ row' | grep -oP '\d+' || echo "?")
        if [ "$rows" = "0" ]; then
          fail "$line"
        else
          ok "$line"
        fi
      elif echo "$line" | grep -qE "answerCard|priming|setSelectedDeck|submitCardAnswer"; then
        echo -e "${YELLOW}[DBG]${RESET} $line"
      else
        echo "$line"
      fi
    done
  exit 0
fi

# ── --instrumented ────────────────────────────────────────────────────────────

if [ "$MODE" = "--instrumented" ]; then
  FILTER_FLAG=""
  for arg in "$@"; do
    case "$arg" in
      --test=*) FILTER_FLAG="-Pandroid.testInstrumentationRunnerArguments.class=expo.modules.ankidroid.WriteBackTest#${arg#--test=}" ;;
    esac
  done

  echo "Running WriteBackTest (Kotlin instrumented tests)…"
  echo "Device: $ANDROID_SERIAL"
  echo "─────────────────────────────────────────────────"

  cd "$APP_DIR"

  # The test runner needs AnkiDroid to be open (or to have been opened once)
  # so its content provider is initialised and the permission dialog has fired.
  # If running on the emulator, setup-test-emulator.sh handles that.

  ./gradlew :anki-droid:connectedAndroidTest \
    -Pandroid.testInstrumentationRunnerArguments.package=expo.modules.ankidroid \
    $FILTER_FLAG \
    2>&1 | tee /tmp/writeback-instrumented.log

  EXIT_CODE="${PIPESTATUS[0]}"
  echo ""
  if [ "$EXIT_CODE" = "0" ]; then
    ok "All WriteBackTests passed — scheduler is accepting answers."
  else
    fail "WriteBackTest FAILED (exit $EXIT_CODE)."
    echo ""
    echo "Failures:"
    grep -E "FAILED|Exception|Error" /tmp/writeback-instrumented.log | head -30 || true
    exit 1
  fi
  exit 0
fi

# ── no valid mode ─────────────────────────────────────────────────────────────

echo "Usage:"
echo "  $0 --live"
echo "  $0 --logcat <log-file>"
echo "  $0 --instrumented [--test=<methodName>]"
exit 1
