# Testing the Conversational Flashcards App

A 4-layer strategy designed for an app where the "real" interaction is
voice + LLM tool-calls. The core insight: **don't validate logic and
audio in the same test**. Each layer tests one thing and is reproducible
in isolation.

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1   Unit tests        Jest, no audio, no API.        │
│  Layer 2   Replay harness    Jest, mocked Gemini, mocked    │
│                              AnkiDroid, deterministic.      │
│  Layer 3   Real Gemini text  Real WebSocket, text input,    │
│                              opt-in.                         │
│  Layer 4a  Audio injection   Real Gemini, fake mic streams  │
│                              pre-loaded PCM in-app.         │
└─────────────────────────────────────────────────────────────┘
```

## Quick start

```bash
# All deterministic layers (free, fast):
npm test

# Single suite:
npx jest --testPathPatterns "sessionManager"
npx jest --testPathPatterns "replay"

# Layer 3 (real API, costs cents per run):
TEST_REAL_GEMINI=1 GEMINI_API_KEY=... npx jest realGemini.text
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
  name: 'happy-path-all-correct',
  cards: awsExamSaCards.slice(0, 3),
  turns: [
    {
      kind: 'answer',
      userSaid: 'subnet level',
      aiGraded: 'correct',
      expectWriteback: { cardId: 1001, pass: true },
    },
    // …
  ],
  expectedFinalStats: { correct: 3, incorrect: 0 },
};
```

Three turn kinds:
- `answer` — user replies, AI grades via `evaluate_and_move_next`.
- `override` — AI calls `override_evaluation`. Doesn't advance the card.
- `endRequested` — AI calls `end_session`.

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
import { loadPcmFixture } from 'src/test-harness/fakeMicSource';

// PCM must be int16 LE, 16 kHz mono, matching what Gemini Live expects.
loadPcmFixture(myPcmBytes, { loop: false });
```

**Generating PCM for self-tests** without a real WAV:

```ts
import { generateSyntheticPcm } from 'src/test-harness/fakeMicSource';

const pcm = generateSyntheticPcm({
  durationSec: 1.5,
  sampleRate: 16000,
  amplitude: 0.3,    // 0..1
  frequency: 800,    // Hz; 0 for DC
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
Layer 1  Unit tests                  ~50 tests
Layer 2  Replay harness               9 tests
Layer 3  Real Gemini text             gated (1 test)
Layer 4a Audio injection harness      bootstrap + helpers
```

Total deterministic: **97 tests** across 8 suites.

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
