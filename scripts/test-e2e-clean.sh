#!/usr/bin/env bash
# test-e2e-clean.sh — Full isolated end-to-end pipeline:
#
#   1. Boot the test emulator (Pixel_9_Test AVD with google_apis image)
#   2. Install AnkiDroid + import the controlled test deck
#   3. Run WriteBackTest.kt (instrumented) to verify the write-back path
#   4. Optionally: start a voice session with AUTO_START_DECK=... (manual step)
#   5. Run monitor-writeback.sh --logcat against the session log
#
# This script exercises the complete isolation story: no personal data, no
# need for a physical device, no prior AnkiDroid state.
#
# Usage:
#   scripts/test-e2e-clean.sh                  # full pipeline
#   scripts/test-e2e-clean.sh --writeback-only  # only run the instrumented tests (emulator must be running)
#
# Prerequisites:
#   sdkmanager "system-images;android-34;google_apis;x86_64"
#   avdmanager create avd -n Pixel_9_Test -k "system-images;android-34;google_apis;x86_64"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MODE="${1:-}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; RESET='\033[0m'
section() { echo -e "\n${CYAN}══ $* ══${RESET}"; }
ok()      { echo -e "${GREEN}[OK]${RESET}  $*"; }
fail()    { echo -e "${RED}[FAIL]${RESET} $*"; }

# ── Step 0: quick env check ───────────────────────────────────────────────────

section "Preflight"

check_cmd() {
  command -v "$1" &>/dev/null || { fail "Required command not found: $1"; exit 1; }
}
check_cmd adb
check_cmd emulator
check_cmd gradle

APKG="$APP_DIR/src/test-harness/fixtures/engram-test-deck.apkg"
[ -f "$APKG" ] || { fail "Test deck not found: $APKG  (run scripts/create-test-apkg.py first)"; exit 1; }
ok "Test deck present: $APKG"

# ── Step 1: Boot + seed ───────────────────────────────────────────────────────

if [ "$MODE" != "--writeback-only" ]; then
  section "Boot + seed"
  export ANDROID_SERIAL="emulator-5554"
  bash "$SCRIPT_DIR/setup-test-emulator.sh"
  ok "Emulator ready"
else
  # Use the preferred connected device (physical or running emulator)
  source "$SCRIPT_DIR/_device.sh"
  section "Skip boot (--writeback-only) — using device: $ANDROID_SERIAL"
fi

# ── Step 2: WriteBackTest ─────────────────────────────────────────────────────

section "WriteBackTest (Kotlin instrumented)"
bash "$SCRIPT_DIR/monitor-writeback.sh" --instrumented
ok "WriteBackTest passed"

# ── Step 3: summary ───────────────────────────────────────────────────────────

section "Summary"
echo ""
ok "Full isolated E2E pipeline completed successfully."
echo ""
echo "What was verified:"
echo "  • AnkiDroid ContentProvider: deck creation, note insertion, isolation"
echo "  • Scheduler write-back: answerCard accepted (>0 rows updated) for ease 1, 4"
echo "  • Queue advancement: just-answered card not re-queued at head immediately"
echo ""
echo "What is NOT automated yet (manual follow-up):"
echo "  • Full voice session on emulator (Gemini Live needs a real network connection)"
echo "  • Visual verification of EvaluationBanner + SFX chimes"
echo ""
echo "To run a voice session against the isolated deck:"
echo "  AUTO_START_DECK='Engram E2E Test Deck' AUTO_START_ENABLED=true npm run android"
echo "  scripts/monitor-writeback.sh --logcat _debug/runs/<latest>.log"
