/**
 * Layer 3 — real Gemini API, text-mode test.
 *
 * Skipped unless TEST_REAL_GEMINI=1 is set. Costs real API money
 * (a few cents per run). Validates that the system prompt + tool
 * definitions still elicit the right grading behavior end-to-end.
 *
 * Run:
 *   TEST_REAL_GEMINI=1 GEMINI_API_KEY=... npx jest realGemini.text
 */

jest.mock('expo-foreground-audio', () => ({
  __esModule: true,
  default: { addListener: jest.fn().mockReturnValue({ remove: jest.fn() }) },
}));

import { runFixtureAgainstRealGemini } from '../realGeminiTextRunner';
import { happyPath } from '../fixtures/scripts';

const SHOULD_RUN = process.env.TEST_REAL_GEMINI === '1';
const API_KEY = process.env.GEMINI_API_KEY ?? '';

const describeIfReal = SHOULD_RUN ? describe : describe.skip;

describeIfReal('Layer 3 — real Gemini text mode', () => {
  jest.setTimeout(120000);

  it('grades the happy-path fixture as expected', async () => {
    if (!API_KEY) {
      throw new Error('GEMINI_API_KEY missing — set in env to run real-API tests');
    }

    const result = await runFixtureAgainstRealGemini(happyPath, API_KEY, {
      logEvents: !!process.env.TEST_REAL_GEMINI_VERBOSE,
    });

    // Don't be too strict — semantic grading is fuzzy and the test
    // measures the AI's behavior, not ours. We accept ≥ 2 of 3 turns
    // matching the expected grade (the fixture answers are clearly
    // correct so any decent prompt should grade them so).
    const matched = result.perTurn.filter((p) => p.matched).length;
    const total = result.perTurn.length;
    console.log(
      `[L3 happyPath] ${matched}/${total} turns matched, observed final stats:`,
      result.observedFinalStats,
    );
    expect(matched).toBeGreaterThanOrEqual(Math.ceil(total * 0.66));
  });
});

if (!SHOULD_RUN) {
  // Surface a clear hint so a curious dev knows the suite exists.
  // eslint-disable-next-line jest/no-export
  describe('Layer 3 — real Gemini text mode (gated)', () => {
    it.skip('set TEST_REAL_GEMINI=1 + GEMINI_API_KEY to run', () => {});
  });
}
