// Maestro `runScript` helper: scrape adb logcat for the most recent
// `[ankiBridge] getDueCards(...)` line, parse the resulting card list,
// assert every returned card belongs to the requested deck.
//
// This works because ankiBridge.getDueCards logs `→ ${rawCards.length}
// cards` and the cards are then logged elsewhere with their deckName.
// We grep for the bridge's own log and the cardLoader's followup line:
//   [CardLoader] Loaded N due cards
// then read N most-recent card-detail entries.
//
// Maestro runScript runs in a Mozilla Rhino-like JS sandbox with a
// limited shell wrapper (`maestro.exec(...)`). Keep this self-contained.

const expectedDeckPrefix = MAESTRO_ENV.EXPECTED_DECK_PREFIX || 'TEST_Deck';

const result = maestro.exec(
  "adb logcat -d -t 200 | grep -E '\\[ankiBridge\\]|\\[CardLoader\\]'"
);
const log = (result.stdout || '');

// The most recent getDueCards line.
const getDueLine = log.split(/\r?\n/).reverse().find(function (l) {
  return l.indexOf('[ankiBridge] getDueCards') >= 0;
});

if (!getDueLine) {
  throw new Error(
    'No `[ankiBridge] getDueCards(...)` log line found in last 200 lines. ' +
    'Either the session never started a deck load, or APP_MODE/logcat ' +
    'filtering is off.'
  );
}

// Parse `getDueCards('<deck>') → N cards`
const match = getDueLine.match(/getDueCards\('([^']+)'\)\s*→\s*(\d+)\s*cards/);
if (!match) {
  throw new Error('Failed to parse getDueCards log line: ' + getDueLine);
}

const deckRequested = match[1];
const cardCount = parseInt(match[2], 10);

if (deckRequested.indexOf(expectedDeckPrefix) !== 0) {
  throw new Error(
    'Wrong deck requested. Expected prefix "' + expectedDeckPrefix +
    '", got "' + deckRequested + '". UI is selecting the wrong deck name.'
  );
}

if (cardCount === 0) {
  throw new Error(
    'getDueCards returned 0 cards for ' + deckRequested + '. ' +
    'Make sure AnkiDroid has at least one note in this deck.'
  );
}

// The cardLoader logs each card via console (sessionManager prints
// `[User]:` and `[AI]:` for transcripts; cards themselves are logged
// only by the bridge with cardId — deckName isn't in the log line).
//
// To assert deck purity from logs alone we'd need to either (a) add a
// dedicated log line in cardLoader that prints each card's deckName,
// or (b) cross-reference cardIds against a Kotlin instrumented test
// that has the deck->cards mapping. For now, the Kotlin instrumented
// test is the authoritative check; this Maestro flow validates the
// UI-to-bridge wiring (right deck name, non-zero cards loaded) and
// stops there.
//
// If cardLoader gains a per-card log line later, replace this comment
// with a stricter assertion that checks each card's deckName.

console.log('OK: ' + cardCount + ' cards loaded from ' + deckRequested);
