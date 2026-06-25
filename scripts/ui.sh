#!/usr/bin/env bash
# ui.sh — Programmatic UI interaction for debugging Engram on a real device.
#
# Wraps `adb shell uiautomator dump` (finds elements by text/desc) and
# `adb shell input tap/swipe/keyevent` into named, scriptable subcommands.
#
# Prerequisites:
#   adb                    (Android platform-tools)
#   python3                (stdlib only — used to parse uiautomator XML)
#
# Interactive alternative:
#   scrcpy                 Mirror + control the phone screen from your laptop.
#   Install: sudo apt install scrcpy   or   brew install scrcpy
#   Run:     scrcpy --turn-screen-on
#   Then use your mouse to tap, type, scroll — no coordinates needed.
#
# Usage:
#   scripts/ui.sh tap <text>              Tap the first element whose text or
#                                         content-desc contains <text>
#   scripts/ui.sh screenshot [label]      Save a timestamped PNG to _debug/screenshots/
#   scripts/ui.sh dump                    Print the full UI tree (for discovering IDs/texts)
#   scripts/ui.sh dump-grep <pattern>     Dump and filter to matching nodes
#   scripts/ui.sh decks                   List deck names visible in deck-select
#   scripts/ui.sh select-deck <name>      Tap the deck row matching <name>
#   scripts/ui.sh start-session           Tap the Start Session / study button
#   scripts/ui.sh end-session             Tap End Session in the notification or UI
#   scripts/ui.sh back                    Press Android back button
#   scripts/ui.sh home                    Press Android home button
#   scripts/ui.sh reload                  Open Expo dev menu + tap Reload
#   scripts/ui.sh devmenu                 Open Expo developer menu (shake equivalent)
#   scripts/ui.sh theme                   Tap the dark/light theme toggle
#   scripts/ui.sh swipe <dir>             Swipe: up | down | left | right
#   scripts/ui.sh input-text <text>       Type text into the focused input
#   scripts/ui.sh keyevent <code>         Send a raw Android keyevent (numeric or named)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

source "$SCRIPT_DIR/_device.sh"

ADB="adb -s $ANDROID_SERIAL"
SCREENSHOTS_DIR="$APP_DIR/_debug/screenshots"

# ── UI dump + element finder ─────────────────────────────────────────────────

# Dump the current UI to a temp XML file and return its path.
_dump_ui() {
  local xml="/tmp/engram-ui-dump.xml"
  $ADB shell uiautomator dump /sdcard/engram-ui-dump.xml >/dev/null 2>&1
  $ADB pull /sdcard/engram-ui-dump.xml "$xml" >/dev/null 2>&1
  echo "$xml"
}

# Find an element by text (or content-desc) and return "cx cy" (centre).
# Returns empty string if not found.
_find_element() {
  local search="$1"
  local xml
  xml="$(_dump_ui)"

  python3 - "$xml" "$search" <<'PYEOF'
import sys, xml.etree.ElementTree as ET, re

dump_file = sys.argv[1]
needle    = sys.argv[2].lower()

tree = ET.parse(dump_file)
for node in tree.iter():
    text  = (node.get('text') or '').lower()
    desc  = (node.get('content-desc') or '').lower()
    resid = (node.get('resource-id') or '').lower()
    if needle in text or needle in desc or needle in resid:
        bounds = node.get('bounds', '')
        m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', bounds)
        if m:
            x1, y1, x2, y2 = map(int, m.groups())
            cx = (x1 + x2) // 2
            cy = (y1 + y2) // 2
            print(f"{cx} {cy}")
            sys.exit(0)

sys.exit(1)
PYEOF
}

# Tap an element by text.
_tap_text() {
  local text="$1"
  local coords
  coords="$(_find_element "$text")" || {
    echo "[ui.sh] ERROR: No element found matching '$text'" >&2
    echo "  Current UI elements:" >&2
    _dump_ui | xargs -I{} python3 - {} <<'PYEOF' | head -30 | sed 's/^/    /' >&2
import sys, xml.etree.ElementTree as ET
for n in ET.parse(sys.argv[1]).iter():
    t = n.get('text', ''); d = n.get('content-desc', '')
    if t or d:
        print(f"text={repr(t)}  desc={repr(d)}")
PYEOF
    return 1
  }
  read -r cx cy <<<"$coords"
  echo "[ui.sh] Tapping '$text' at ($cx, $cy)"
  $ADB shell input tap "$cx" "$cy"
}

# ── Subcommands ──────────────────────────────────────────────────────────────

CMD="${1:-help}"
shift || true

case "$CMD" in

  tap)
    [ -z "${1:-}" ] && { echo "Usage: ui.sh tap <text>"; exit 1; }
    _tap_text "$1"
    ;;

  screenshot)
    LABEL="${1:-snap}"
    mkdir -p "$SCREENSHOTS_DIR"
    TS="$(date +%Y%m%d-%H%M%S)"
    OUT="$SCREENSHOTS_DIR/${TS}-${LABEL}.png"
    $ADB shell screencap -p /sdcard/engram-screenshot.png
    $ADB pull /sdcard/engram-screenshot.png "$OUT" >/dev/null
    echo "[ui.sh] Screenshot saved: $OUT"
    # Open in the system image viewer if available (non-blocking)
    xdg-open "$OUT" 2>/dev/null &
    ;;

  dump)
    xml="$(_dump_ui)"
    python3 - "$xml" <<'PYEOF'
import sys, xml.etree.ElementTree as ET

def print_tree(node, indent=0):
    cls    = node.get('class', '').split('.')[-1]
    text   = node.get('text', '')
    desc   = node.get('content-desc', '')
    resid  = node.get('resource-id', '')
    bounds = node.get('bounds', '')
    label  = text or desc
    rid    = f"  [{resid.split('/')[-1]}]" if resid else ''
    if label or resid:
        print(f"{'  ' * indent}{cls}{rid}: {repr(label)}  {bounds}")
    for child in node:
        print_tree(child, indent + 1)

tree = ET.parse(sys.argv[1])
print_tree(tree.getroot())
PYEOF
    ;;

  dump-grep)
    [ -z "${1:-}" ] && { echo "Usage: ui.sh dump-grep <pattern>"; exit 1; }
    xml="$(_dump_ui)"
    python3 - "$xml" "$1" <<'PYEOF'
import sys, xml.etree.ElementTree as ET

needle = sys.argv[2].lower()
for node in ET.parse(sys.argv[1]).iter():
    text  = node.get('text', '')
    desc  = node.get('content-desc', '')
    resid = node.get('resource-id', '')
    b     = node.get('bounds', '')
    if needle in text.lower() or needle in desc.lower() or needle in resid.lower():
        print(f"text={repr(text)}  desc={repr(desc)}  id={resid}  bounds={b}")
PYEOF
    ;;

  decks)
    echo "[ui.sh] Deck rows visible in current UI:"
    xml="$(_dump_ui)"
    python3 - "$xml" <<'PYEOF'
import sys, xml.etree.ElementTree as ET, re

# Deck rows in deck-select render with a text node that isn't a button label.
# Heuristic: text nodes inside scrollable lists whose text is not a short
# action word.
ACTION_WORDS = {'start', 'end', 'session', 'settings', 'sign', 'out',
                'reload', 'close', 'back', 'maybe', 'subscribe', 'later'}

for node in ET.parse(sys.argv[1]).iter():
    text = node.get('text', '').strip()
    if (text and len(text) > 2
            and text.lower() not in ACTION_WORDS
            and not text.startswith('{')):
        bounds = node.get('bounds', '')
        print(f"  {repr(text)}  {bounds}")
PYEOF
    ;;

  select-deck)
    [ -z "${1:-}" ] && { echo "Usage: ui.sh select-deck <partial-deck-name>"; exit 1; }
    _tap_text "$1"
    ;;

  start-session)
    # The session starts when a deck row is tapped (long-press opens settings,
    # normal tap opens session). This is a shortcut that just re-taps whatever
    # deck is currently highlighted, or taps "Start" if a button with that text exists.
    _tap_text "Start" 2>/dev/null || _tap_text "study" 2>/dev/null || {
      echo "[ui.sh] No 'Start' button found — tap your deck in deck-select instead."
      exit 1
    }
    ;;

  end-session)
    # Try the notification action first, then the in-session End button.
    $ADB shell input keyevent KEYCODE_WAKEUP
    _tap_text "End Session" 2>/dev/null || _tap_text "end" 2>/dev/null || {
      echo "[ui.sh] No 'End Session' button found. Is a session running?"
      exit 1
    }
    ;;

  back)
    $ADB shell input keyevent KEYCODE_BACK
    echo "[ui.sh] Pressed Back"
    ;;

  home)
    $ADB shell input keyevent KEYCODE_HOME
    echo "[ui.sh] Pressed Home"
    ;;

  reload)
    # Expo dev menu: shake gesture = keyevent 82 (KEYCODE_MENU) on most builds.
    echo "[ui.sh] Opening Expo dev menu..."
    $ADB shell input keyevent 82
    sleep 1
    _tap_text "Reload" 2>/dev/null || _tap_text "reload" 2>/dev/null || {
      echo "[ui.sh] Dev menu opened but 'Reload' not found — try ui.sh dump to see what's there."
      exit 1
    }
    echo "[ui.sh] App reloaded."
    ;;

  devmenu)
    # Open the Expo developer menu without tapping Reload.
    $ADB shell input keyevent 82
    echo "[ui.sh] Dev menu opened (keyevent 82)."
    ;;

  theme)
    # Try to find a theme-related toggle — dark mode, light mode, theme.
    _tap_text "dark" 2>/dev/null \
      || _tap_text "light" 2>/dev/null \
      || _tap_text "theme" 2>/dev/null \
      || {
        echo "[ui.sh] No theme toggle found in current UI. Use 'ui.sh dump' to inspect."
        exit 1
      }
    ;;

  swipe)
    DIR="${1:-up}"
    # Swipe on a Pixel 9 (1080×2400). Midpoint x=540, safe y-band 600–1800.
    case "$DIR" in
      up)    $ADB shell input swipe 540 1600 540 600  300 ;;
      down)  $ADB shell input swipe 540 600  540 1600 300 ;;
      left)  $ADB shell input swipe 900 1000 200 1000 300 ;;
      right) $ADB shell input swipe 200 1000 900 1000 300 ;;
      *)     echo "Unknown direction '$DIR'. Use: up | down | left | right"; exit 1 ;;
    esac
    echo "[ui.sh] Swiped $DIR"
    ;;

  input-text)
    [ -z "${1:-}" ] && { echo "Usage: ui.sh input-text <text>"; exit 1; }
    # Replace spaces with %s so adb sends the whole string as one argument.
    ENCODED="${1// /%s}"
    $ADB shell input text "$ENCODED"
    echo "[ui.sh] Typed: $1"
    ;;

  keyevent)
    [ -z "${1:-}" ] && { echo "Usage: ui.sh keyevent <code>"; exit 1; }
    $ADB shell input keyevent "$1"
    echo "[ui.sh] Keyevent: $1"
    ;;

  help|--help|-h|"")
    cat <<'HELP'
ui.sh — Engram UI interaction helper

Interactive (recommended for ad-hoc debugging):
  scrcpy --turn-screen-on        Mirror + mouse-control the device screen.
  Install: sudo apt install scrcpy

Scripted subcommands:
  tap <text>                     Tap element whose text/desc contains <text>
  screenshot [label]             Save PNG to _debug/screenshots/
  dump                           Print full UI tree
  dump-grep <pattern>            Filter UI tree to matching elements
  decks                          List visible deck names
  select-deck <name>             Tap a deck row by partial name
  start-session                  Tap the Start button
  end-session                    Tap End Session
  back                           Android back button
  home                           Android home button
  reload                         Open Expo dev menu → tap Reload
  devmenu                        Open Expo dev menu (no action)
  theme                          Tap the dark/light theme toggle
  swipe <up|down|left|right>     Swipe gesture
  input-text <text>              Type into focused input
  keyevent <code>                Raw Android keyevent

Examples:
  scripts/ui.sh select-deck "AWS Exam"
  scripts/ui.sh screenshot before-session
  scripts/ui.sh tap "Settings"
  scripts/ui.sh dump-grep "deck"
  scripts/ui.sh reload
  scripts/ui.sh swipe up
HELP
    ;;

  *)
    echo "[ui.sh] Unknown command: $CMD"
    echo "Run 'scripts/ui.sh help' for usage."
    exit 1
    ;;

esac
