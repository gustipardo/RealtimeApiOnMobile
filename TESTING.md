# Testing the Conversational Flashcards App

A 6-layer strategy designed for an app where the "real" interaction is
voice + LLM tool-calls + a native AnkiDroid bridge. The core insight:
**don't validate logic and audio in the same test, and don't validate
ContentProvider behavior in JS**. Each layer tests one thing and is
reproducible in isolation.

```
┌──────────────────────────────────────────────────────────────────┐
│  Layer 1   Unit tests           Jest, no audio, no API.          │
│  Layer 2   Replay harness       Jest, mocked Gemini, mocked      │
│                                 AnkiDroid, deterministic.        │
│  Layer 3   Real Gemini text     Real WebSocket, text input,      │
│                                 opt-in.                          │
│  Layer 4a  Audio injection      Real Gemini, fake mic streams    │
│                                 pre-loaded PCM in-app.           │
│  Layer 5   Kotlin instrumented  Real AnkiDroid on emulator,      │
│                                 ContentProvider exercised. The   │
│                                 only layer that catches deck     │
│                                 mixing + other bridge bugs.      │
│  Layer 6   Maestro flows        Real Engram APK + real AnkiDroid │
│                                 + scripted UI navigation. Full   │
│                                 end-to-end including bridge.     │
└──────────────────────────────────────────────────────────────────┘
```

## Quick start

```bash
# All deterministic JS layers (free, fast):
npm test

# Single suite:
npx jest --testPathPatterns "sessionManager"
npx jest --testPathPatterns "replay"

# Layer 3 (real API, costs cents per run):
TEST_REAL_GEMINI=1 GEMINI_API_KEY=... npx jest realGemini.text

# Layer 5 (real AnkiDroid on emulator, ~1 minute):
npm run test:instrumented   # boots Pixel_9_Automatic if needed

# Layer 6 (full UI flow on device/emulator, requires Engram APK installed):
npm run test:maestro            # session deck-isolation (scaffold)
npm run test:maestro:account    # Account & Settings screen

# Layer 6b — RTL component render tests (jest-expo, separate config):
npm run test:rtl
#   ⚠ Currently blocked by an Expo SDK 54 jest "winter" runtime issue —
#   see _debug/account-settings-bugs.md BUG-ENV-1. Kept out of `npm test`.

# Everything but Maestro (the cheapest 95% of coverage):
npm run test:all
```

Tests pass when there are no failures. Skipped suites are expected for
Layer 3 unless explicitly enabled.

---

## Layer 1 — Unit tests

**What:** Direct invocations of `sessionManager` private handlers and
`ankiBridge` methods, with everything around them mocked. Validates the
write-back contract (correct → ease=4, incorrect → ease=1, skipped → no
write), the override flip (correct ↔ incorrect), retry behavior, and
tool-call routing.

**Files:**

- `src/services/__tests__/sessionManager.test.ts`
- `src/native/__tests__/ankiBridge.test.ts`
- `src/services/__tests__/audioLevelTracker.test.ts` — RMS math
- `src/stores/__tests__/*` — store logic
- `src/services/__tests__/foregroundAudioService.test.ts`

**When to add a Layer 1 test:** new tool handler in `sessionManager`,
new branch in `ankiBridge`, anything where the inputs/outputs are
already plain data.

---

## Layer 2 — Replay harness

**What:** A scriptable Mock Gemini Manager (`mockGeminiManager.ts`)
that satisfies the same interface as the real one but emits synthetic
events on demand. The `scriptRunner` walks a fixture (deck + turn list)
through a real `sessionManager.startSession()` call, with the mock
standing in for the real WebSocket and a `DeckSimulator` standing in
for AnkiDroid. Captures every `ankiBridge.answerCard(...)` call so
tests can assert the entire write-back history.

**Files:**

- `src/test-harness/mockGeminiManager.ts`
- `src/test-harness/deckSimulator.ts`
- `src/test-harness/scriptRunner.ts`
- `src/test-harness/fixtures/aws-exam-sa.ts` — card subset
- `src/test-harness/fixtures/scripts.ts` — turn lists
- `src/test-harness/__tests__/replay.test.ts`

**Fixture format** (excerpt):

```ts
export const happyPath: Fixture = {
  name: "happy-path-all-correct",
  cards: awsExamSaCards.slice(0, 3),
  turns: [
    {
      kind: "answer",
      userSaid: "subnet level",
      aiGraded: "correct",
      expectWriteback: { cardId: 1001, pass: true },
    },
    // …
  ],
  expectedFinalStats: { correct: 3, incorrect: 0 },
};
```

Five turn kinds:

- `answer` — user replies, AI grades via `evaluate_and_move_next`. Emits
  the production two-turn shape: silent tool-call turn (response.done with
  no audio, intentionally skipped), then speaking turn (audio.delta then
  response.done that triggers advance).
- `override` — AI calls `override_evaluation`. Doesn't advance the card.
- `endRequested` — AI calls `end_session`.
- `silentGrade` — AI verbalises a verdict but NEVER fires
  `evaluate_and_move_next`. Tests that no popup, no write, no advance, no
  stat change happens — the contract that grading without a tool call is
  a no-op. Catches the "tutor mentions correct/incorrect but no popup
  shows" symptom at the JS layer.
- `toolCallNoAudio` — AI calls the tool correctly but never speaks
  afterward. Pins the current stuck-state behavior (phase stuck in
  `evaluating`, card never advances despite a successful write). Future
  recovery work will deliberately flip this assertion.

**Per-turn diagnostics** captured in `RunResult.perTurn[i]`:

- `ankiWritesAfter` — cumulative AnkiDroid writes after this turn.
- `statsAfter` — `{ correct, incorrect }` from session store.
- `phaseAfter` — session phase at end of turn (catches "UI stuck" bugs
  where phase doesn't recover after a turn).
- `lastEvaluationAfter` — drives the verdict popup. `null` means popup
  stays cleared.
- `cardIndexAfter` — `useSessionStore.currentCardIndex`, the value the
  UI binds to. Catches "advanceCard never ran" regressions.
- `toolResultAfter` — what the runner sent back to the (mock) AI.

**Adding a fixture:** append to `scripts.ts`, then add a test case in
`replay.test.ts`. The harness's "every turn matches its expectWriteback
hint" invariant test will validate the new fixture for free.

**When to add a Layer 2 test:** anything spanning multiple turns,
override-then-answer flows, write-back ordering, anything where state
carries between handlers.

---

## Layer 3 — Real Gemini, text input

**What:** Same flow as Layer 2 but the mock is replaced by a live
WebSocket to Gemini Live, and "user said X" is sent as
`clientContent.turns[].parts[].text` instead of audio. This validates
prompt-quality regressions and tool-call decisions without needing
audio at all.

**Files:**

- `src/test-harness/realGeminiTextRunner.ts` — the runner
- `src/test-harness/__tests__/realGemini.text.test.ts` — gated suite

**Run:**

```bash
TEST_REAL_GEMINI=1 GEMINI_API_KEY=ya29… npx jest realGemini.text
```

**Cost:** ~$0.005-0.02 per fixture. Skipped by default.

**Lenient assertions:** the runner expects ≥ 66% of turns to match the
expected grade. Semantic grading is fuzzy — being too strict means
false positives every time the AI rephrases a verdict.

**When to add a Layer 3 test:** when shipping prompt changes, model
upgrades, or new tools — verify the AI still follows the contract.

---

## Layer 4a — Audio injection (in-app)

**What:** APP_MODE=test swaps the mic source from
`expo-foreground-audio` to a `fakeMicSource` that streams pre-loaded
PCM at the same cadence as the real native pipeline. Real Gemini, real
audio path, but reproducible — same WAV in, same chunks out.

**Files:**

- `src/services/micSource.ts` — abstraction layer
- `src/test-harness/fakeMicSource.ts` — file-streaming impl
- `src/test-harness/bootstrap.ts` — `installTestHarness()` switches
  the source on app boot
- `src/app/_layout.tsx` — calls `installTestHarness()` early

**Activate test mode:**

```bash
APP_MODE=test npx expo run:android
```

Or set in `app.config.js` extras for a build profile.

**Loading a clip:**

```ts
import { loadPcmFixture } from "src/test-harness/fakeMicSource";

// PCM must be int16 LE, 16 kHz mono, matching what Gemini Live expects.
loadPcmFixture(myPcmBytes, { loop: false });
```

**Generating PCM for self-tests** without a real WAV:

```ts
import { generateSyntheticPcm } from "src/test-harness/fakeMicSource";

const pcm = generateSyntheticPcm({
  durationSec: 1.5,
  sampleRate: 16000,
  amplitude: 0.3, // 0..1
  frequency: 800, // Hz; 0 for DC
});
loadPcmFixture(pcm);
```

**Recording real WAVs to use:**

1. Record yourself answering the fixture cards (any recorder app).
2. Convert to 16 kHz mono 16-bit PCM:
   ```bash
   ffmpeg -i my-answer.m4a -ar 16000 -ac 1 -sample_fmt s16 -f s16le my-answer.pcm
   ```
3. Embed as a JS module:
   ```bash
   xxd -i my-answer.pcm > src/test-harness/fixtures/audio/my-answer.ts
   # then edit to export as a Uint8Array
   ```
4. In test setup: `loadPcmFixture(myAnswerPcm)`.

**When to add a Layer 4a test:** mic-pipeline regressions, native module
changes, end-to-end smoke testing before a release. Don't run Layer 4a
on every commit — it's slower and pricier than Layer 3.

---

## The diagnostic VU meter

The in-session audio meter (`AudioLevelMeter` in `session.tsx`) is now
backed by **real RMS amplitude** computed from each PCM chunk
(previously it used a constant byte-per-packet heuristic that never
moved).

When something feels wrong:

1. Speak loudly. The meter should hit "Audio OK" within ~500 ms.
2. If it stays at "No mic data" — the mic pipeline isn't delivering
   chunks at all. Check permissions / `expo-foreground-audio` init.
3. If it's stuck at "Quiet" — input gain is too low. Phone mic settings
   or accessibility audio amplification.
4. If it shows "Audio OK" but the AI doesn't respond — issue is on the
   send/network/Gemini side, not the mic. Check `[Gemini]` logs.

The meter reads from `useAudioLevelStore` and is updated by
`audioLevelTracker.ts`, which subscribes to `micSource` (so it works
the same way for fakeMicSource in test mode).

---

## Test coverage at a glance

```
Layer 1  Unit tests                  ~57 tests
Layer 2  Replay harness              22 tests (incl. silentGrade,
                                     toolCallNoAudio, phase invariants)
Layer 3  Real Gemini text             gated (1 test)
Layer 4a Audio injection harness      bootstrap + helpers
Layer 5  Kotlin instrumented           5 tests (deck isolation, deck
                                     name lookup, notes-URI bug doc)
Layer 6  Maestro flows                 2 flows (deck isolation scaffold;
                                     account-settings — green on device)
Layer 6b RTL component render          settings.rtl.test.tsx (written;
                                     blocked by jest-expo winter, BUG-ENV-1)
```

## Layer 6b — RTL component render tests (jest-expo)

React Native Testing Library renders real screens (react-test-renderer) to
assert per-state UI and interactions — e.g. the Account screen's plan card
across all five `PlanState` branches, the Dark toggle, Restore, Sign-out
confirm, Manage deep-link, Subscribe routing.

- Config: `jest.config.rtl.js` (preset `jest-expo`), test files `*.rtl.test.tsx`,
  kept out of `npm test` via `testPathIgnorePatterns`. Run with `npm run test:rtl`.
- Deps: `@testing-library/react-native`, `test-renderer` (RTL 14's renderer
  for React 19 — **not** `react-test-renderer`).
- NativeWind's css-interop jsx-runtime is remapped to React's in the RTL config
  (the screens use inline styles, so nothing is lost).
- **Status:** the one test (`src/__tests__/settings.rtl.test.tsx`) is written but
  blocked on an Expo SDK 54 winter-runtime issue under the jest sandbox. See
  `_debug/account-settings-bugs.md` BUG-ENV-1 for the repro and two fixes to try.
  Until then, plan-state branch correctness is covered by
  `src/utils/__tests__/planState.test.ts` + the Maestro flow + on-device.

**When to add a Layer 6b test:** a new screen with conditional rendering whose
branches are hard to reach on-device (e.g. server-gated states).

Total deterministic JS: **115 tests** across 9 suites.
Total instrumented: **5 tests** on emulator.

## Bug classes the harness pins

| Symptom                                                                    | Catchment                                                   |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| AI verbalises a verdict, no popup / no advance / no write                  | Layer 2 `silentGrade` family                                |
| AI tool-calls correctly, then UI stuck (no advance)                        | Layer 2 `toolCallNoAudio` characterization                  |
| Phase desync between sessionManager and UI store                           | Layer 2 phase + advance invariants                          |
| `lastEvaluation` popup state corrupted                                     | Layer 2 invariant on `lastEvaluationAfter`                  |
| Re-introduction of in-tool-handler `getDueCards` re-query (race)           | Layer 1 sessionManager test "no re-query" guard             |
| **AnkiDroid ContentProvider quirks (cross-deck leak in `getDueCards`)**    | **Layer 5 `GetDueCardsTest` — runs against real AnkiDroid** |
| UI rendering `session.tsx` doesn't react to store changes                  | NOT covered — needs `@testing-library/react-native`         |
| Real AI prompt regressions / "AI verbalises but doesn't tool-call"         | Partially covered (Layer 3, only 1 fixture today)           |
| Full UI → bridge → AnkiDroid integration (deck name passed correctly etc.) | Layer 6 Maestro flow (scaffold; needs Engram APK first)     |

---

## Layer 5 — Kotlin instrumented tests

**What:** JUnit tests that run on a connected Android emulator with a
real AnkiDroid install. Exercise `AnkiDroidQueries` (the extracted
`getDueCards`/`answerCard` core logic from `AnkiDroidModule.kt`) against
the real `FlashCardsContract` ContentProvider. Catches bugs in our
Kotlin code AND quirks of the AnkiDroid ContentProvider that no
JS-layer test can see.

**Files:**

- `modules/anki-droid/android/src/main/.../AnkiDroidQueries.kt` —
  the extracted production logic, called from both `AnkiDroidModule`'s
  AsyncFunctions and the test.
- `modules/anki-droid/android/src/androidTest/.../GetDueCardsTest.kt` —
  the deck-isolation regression suite. Seeds two test decks via direct
  `ContentResolver` inserts (no external library), asserts every
  returned card belongs to the requested deck (by note ID, not by the
  echoed `deckName` field).
- `modules/anki-droid/android/src/androidTest/.../SmokeTest.kt` —
  toolchain canary.
- `modules/anki-droid/android/src/androidTest/AndroidManifest.xml` —
  declares `com.ichi2.anki.permission.READ_WRITE_DATABASE`, which the
  test runtime grants via `GrantPermissionRule`.
- `scripts/test-instrumented.sh` — boots `Pixel_9_Automatic` headless
  if no device is attached, waits for boot complete, runs Gradle.

**Tests in `GetDueCardsTest`:**

- `queryDueCards_returnsOnlyTheRequestedDeck` — assertion on note IDs,
  not `deckName` (which is just the input echoed back).
- `queryDueCards_querySymmetric_otherDeckAlsoIsolated` — same in reverse,
  guards against a hardcoded "DeckA" check passing test #1 by accident.
- `queryDeckId_resolvesNamedDecks` — sanity on deck name → id lookup.
- `notesUri_doesNotFilterByDeck_documentsTheBugClassWeAvoid` — runs the
  buggy notes URI directly to prove it still leaks. If AnkiDroid ever
  fixes the notes URI filter, this test fails and we know we can drop
  the cards-URI workaround.
- `SmokeTest.targetContextIsAvailable` — toolchain.

**Run:**

```bash
npm run test:instrumented
```

**Prereqs (one-time):**

1. Android SDK with `emulator` + `adb` in `$ANDROID_HOME`.
2. AVD named `Pixel_9_Automatic` (or set `ENGRAM_TEST_AVD=<name>`).
3. AnkiDroid 2.24+ installed on the AVD:
   ```bash
   curl -L -o /tmp/ankidroid.apk \
     https://github.com/ankidroid/Anki-Android/releases/download/v2.24.0/variant-abi-AnkiDroid-2.24.0-x86_64.apk
   adb install /tmp/ankidroid.apk
   ```
4. AnkiDroid bootstrapped — open it once, dismiss the intro screens
   (the default collection + "Basic" model are created on first run):
   ```bash
   adb shell pm grant com.ichi2.anki android.permission.POST_NOTIFICATIONS
   adb shell appops set com.ichi2.anki MANAGE_EXTERNAL_STORAGE allow
   adb shell monkey -p com.ichi2.anki -c android.intent.category.LAUNCHER 1
   # Manually tap "Get Started" then "Continue" once.
   ```

**When to add a Layer 5 test:** any change to `AnkiDroidQueries.kt` —
new ContentProvider URI usage, new column, write-back contract change.
Whenever you touch the bridge code, write a Kotlin test before merging.

---

## Layer 6 — Maestro flows (scaffold)

**What:** End-to-end tests driving the real Engram APK on the emulator
through actual UI taps. Covers integration bugs Layer 5 can't see —
e.g. UI passes the wrong deck name to the bridge, or `session.tsx`
doesn't render the cards the bridge returned.

**Files:**

- `.maestro/session-deck-isolation.yaml` — the deck-isolation flow.
- `.maestro/scripts/assert-deck-isolation.js` — `runScript` helper that
  parses logcat and asserts on the bridge's actual call.
- `.maestro/subflows/dismiss-onboarding.yaml` — idempotent first-launch
  skip.

**Run:**

```bash
npm run test:maestro
```

**Status:** SCAFFOLD. The flow is written and referenced from
`package.json`, but it requires the Engram APK installed on the
emulator with `APP_MODE=test` (so `installTestHarness()` swaps
`fakeMicSource` in and the AI bypass kicks in). The selectors will
need adjustment when first executed against a real build — UI text
strings change, IDs may need to be added.

**When to add a Layer 6 flow:** for bugs that span UI ↔ bridge, or for
release smoke tests. Don't write Layer 6 for anything Layer 5 already
covers — Maestro is slower and harder to debug.

---

## Adding a new feature: testing checklist

1. **Layer 1** — unit-test the new handler / branch / utility. Should
   feel cheap to write; if it doesn't, the design is probably tangled.
2. **Layer 2** — if it's a multi-turn flow, add a fixture in
   `scripts.ts` and a test case in `replay.test.ts`.
3. **Prompt change?** — add a Layer 3 case (gated). Run once with the
   real API to confirm the AI behaves as expected.
4. **Mic / audio path?** — try it with Layer 4a (loaded WAV) on the
   emulator before declaring victory.
