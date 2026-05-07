/**
 * Integration test for sessionManager.startSession() — focused on what cards
 * actually end up in the in-memory cache after the start flow runs.
 *
 * Unlike sessionManager.test.ts (which mocks cardLoader to isolate tool-call
 * dispatch), this file uses the REAL cardLoader and useCardCacheStore so we
 * exercise the full path:
 *
 *   startSession() → loadDueCards(deckName) → ankiBridge.getDueCards(deckName)
 *     → AnkiDroidModule.getDueCards(deckName) [mocked here] → setCards(...)
 *
 * The mock on AnkiDroidModule simulates what the native Kotlin layer returns:
 *
 *   - Pre-fix behavior: schedule URI returns one card per query, so mock
 *     returns a single card. Cache ends up with 1 card → reproduces the
 *     "session is only ever 1 card" bug the user reported on device.
 *   - Post-fix behavior: native getDueCards uses the schedule URI for the
 *     head card and pads from notes/?deckID= up to deck.dueCount. Mock
 *     returns N cards. Cache ends up with N cards → fix verified.
 *
 * Side-effect modules (realtime/audio/analytics/prompts) are still mocked
 * because they require a connected device or running services to function.
 */

const mockSendToolResult = jest.fn();
const mockSendTextMessage = jest.fn();
const mockSendEvent = jest.fn();
const mockSetMicrophoneMuted = jest.fn();
const mockUpdateSession = jest.fn().mockResolvedValue(undefined);
const mockOn = jest.fn();
const mockOff = jest.fn();
const mockOffAll = jest.fn();
const mockConnect = jest.fn().mockResolvedValue(true);
const mockDisconnect = jest.fn();
const mockReconnect = jest.fn().mockResolvedValue(true);
const mockWaitForNextResponseDone = jest.fn().mockResolvedValue(undefined);
const mockGetAudioStats = jest.fn().mockResolvedValue({ bytesSent: 0, packetsSent: 0 });
const mockDebugAudioTrackState = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-foreground-audio', () => ({
  __esModule: true,
  default: { addListener: jest.fn().mockReturnValue({ remove: jest.fn() }) },
}));

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(store.get(k) ?? null)),
      setItem: jest.fn((k: string, v: string) => { store.set(k, v); return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { store.delete(k); return Promise.resolve(); }),
      clear: jest.fn(() => { store.clear(); return Promise.resolve(); }),
    },
  };
});

jest.mock('../realtimeManager', () => ({
  realtimeManager: {
    connect: (...a: any[]) => mockConnect(...a),
    disconnect: (...a: any[]) => mockDisconnect(...a),
    reconnect: (...a: any[]) => mockReconnect(...a),
    setMicrophoneMuted: (...a: any[]) => mockSetMicrophoneMuted(...a),
    updateSession: (...a: any[]) => mockUpdateSession(...a),
    sendTextMessage: (...a: any[]) => mockSendTextMessage(...a),
    sendToolResult: (...a: any[]) => mockSendToolResult(...a),
    sendEvent: (...a: any[]) => mockSendEvent(...a),
    on: (...a: any[]) => mockOn(...a),
    off: (...a: any[]) => mockOff(...a),
    offAll: (...a: any[]) => mockOffAll(...a),
    waitForNextResponseDone: (...a: any[]) => mockWaitForNextResponseDone(...a),
    getAudioStats: (...a: any[]) => mockGetAudioStats(...a),
    debugAudioTrackState: (...a: any[]) => mockDebugAudioTrackState(...a),
    onConnectionDropped: null as null | (() => void),
  },
}));

// Mock the NATIVE module (anki-droid), not the JS bridge above it. This is
// the boundary the Kotlin fix lives behind — the test pretends to be the
// native module returning cards. ankiBridge.getDueCards is exercised for
// real, so its mapping logic (cardOrd default, etc.) is also covered.
const mockNativeGetDueCards = jest.fn();
const mockNativeAnswerCard = jest.fn().mockResolvedValue({ updatedCards: 1, totalCards: 1 });
const mockNativeTriggerSync = jest.fn().mockResolvedValue(undefined);
const mockNativeIsInstalled = jest.fn().mockResolvedValue(true);
const mockNativeHasApiPermission = jest.fn().mockResolvedValue(true);
const mockNativeGetDeckNames = jest.fn().mockResolvedValue(['Aws Exam SA']);
const mockNativeGetDeckInfo = jest.fn().mockResolvedValue([
  { deckName: 'Aws Exam SA', dueCount: 10, newCount: 5, learnCount: 0, reviewCount: 5 },
]);
jest.mock('anki-droid', () => ({
  __esModule: true,
  default: {
    isInstalled: (...a: any[]) => mockNativeIsInstalled(...a),
    hasApiPermission: (...a: any[]) => mockNativeHasApiPermission(...a),
    requestApiPermission: jest.fn().mockResolvedValue(true),
    getDeckNames: (...a: any[]) => mockNativeGetDeckNames(...a),
    getDeckInfo: (...a: any[]) => mockNativeGetDeckInfo(...a),
    getDueCards: (...a: any[]) => mockNativeGetDueCards(...a),
    answerCard: (...a: any[]) => mockNativeAnswerCard(...a),
    triggerSync: (...a: any[]) => mockNativeTriggerSync(...a),
  },
}));

jest.mock('../foregroundAudioService', () => ({
  startForegroundService: jest.fn().mockResolvedValue(undefined),
  stopForegroundService: jest.fn().mockResolvedValue(undefined),
  updateForegroundNotification: jest.fn().mockResolvedValue(undefined),
  requestAudioFocus: jest.fn().mockResolvedValue(undefined),
  abandonAudioFocus: jest.fn().mockResolvedValue(undefined),
  clearAudioFocusPauseFlag: jest.fn(),
  isServiceRunning: jest.fn().mockReturnValue(false),
  wasPausedByAudioFocusLoss: jest.fn().mockReturnValue(false),
}));

jest.mock('../audioLevelTracker', () => ({
  startAudioLevelTracking: jest.fn(),
  stopAudioLevelTracking: jest.fn(),
}));

jest.mock('../analytics', () => ({
  AnalyticsEvents: {
    sessionStarted: jest.fn(),
    sessionCompleted: jest.fn(),
    sessionError: jest.fn(),
    sessionReconnected: jest.fn(),
  },
}));

jest.mock('../../config/prompts', () => ({
  getSystemPrompt: jest.fn().mockReturnValue('SYS'),
  getInitialMessage: jest.fn().mockReturnValue('FIRST'),
  getResumeMessage: jest.fn().mockReturnValue('RESUME'),
  formatToolResult: jest.fn().mockReturnValue({ status: 'success' }),
  allTools: [],
}));

import { sessionManager } from '../sessionManager';
import { useSessionStore } from '../../stores/useSessionStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useCardCacheStore } from '../../stores/useCardCacheStore';

const DECK = 'Aws Exam SA';

const makeNativeCard = (id: number, ord = 0) => ({
  cardId: id,
  cardOrd: ord,
  front: `Q${id}`,
  back: `A${id}`,
  deckName: DECK,
});

beforeEach(() => {
  jest.clearAllMocks();
  useSessionStore.getState().resetSession();
  useCardCacheStore.getState().clear();
  useSettingsStore.setState({
    selectedDeck: DECK,
    onboardingCompleted: true,
    alwaysReadBack: false,
    darkMode: true,
    deckInstructions: {},
  });
  (sessionManager as any).pendingCardAdvance = false;
  (sessionManager as any).lastAnsweredCardId = null;
  (sessionManager as any).lastAnsweredCardOrd = null;
  (sessionManager as any).toolCallNames = new Map();
});

describe('sessionManager.startSession() — cache contents after start', () => {
  it('reproduces the bug: native module returns 1 card → cache has 1 card', async () => {
    // Pre-fix behavior. AnkiDroid 2.23.x schedule URI returns one card per
    // query and the old getDueCards stopped there. Result on device: every
    // session is exactly one card long regardless of the deck's due count.
    mockNativeGetDueCards.mockResolvedValueOnce([makeNativeCard(101)]);

    await sessionManager.startSession();

    const { cards, currentIndex } = useCardCacheStore.getState();
    expect(cards).toHaveLength(1);
    expect(cards[0].cardId).toBe(101);
    expect(currentIndex).toBe(0);

    // The native bridge was called exactly once with the selected deck —
    // proves we exercised the real loadDueCards → ankiBridge.getDueCards path.
    expect(mockNativeGetDueCards).toHaveBeenCalledWith(DECK);
    expect(mockNativeGetDueCards).toHaveBeenCalledTimes(1);
  });

  it('verifies the fix: native module returns N cards → cache has N cards', async () => {
    // Post-fix behavior. The Kotlin getDueCards now hybrid-loads (schedule
    // URI for the head + ord, notes URI for the rest, capped at dueCount).
    // The native bridge therefore returns multiple cards in one call.
    const nativeCards = [
      makeNativeCard(201, 0), // head card from schedule URI (real ord)
      makeNativeCard(202),    // padding from notes URI
      makeNativeCard(203),
      makeNativeCard(204),
      makeNativeCard(205),
    ];
    mockNativeGetDueCards.mockResolvedValueOnce(nativeCards);

    await sessionManager.startSession();

    const { cards, currentIndex } = useCardCacheStore.getState();
    expect(cards).toHaveLength(5);
    expect(cards.map((c) => c.cardId)).toEqual([201, 202, 203, 204, 205]);
    expect(currentIndex).toBe(0);
    // First card from schedule URI keeps its ord (used for write-back).
    expect(cards[0].cardOrd).toBe(0);
  });

  it('throws when native module returns no due cards (empty deck case)', async () => {
    // No cards due → loadDueCards returns []  → startSession transitions
    // to error('no_cards') and rethrows. Captures the existing contract so
    // we don't silently break the no-cards-due UX while fixing the count bug.
    mockNativeGetDueCards.mockResolvedValueOnce([]);

    await expect(sessionManager.startSession()).rejects.toThrow(/No cards due/);
    expect(useCardCacheStore.getState().cards).toHaveLength(0);
    expect(useSessionStore.getState().phase).toBe('error');
  });

  it('passes the selected deck name through to the native module', async () => {
    // Regression check: the wrong-deck bug from 2026-05-06 was a side effect
    // of AnkiDroid ignoring ?deckID= on the schedule URI; the JS layer must
    // still pass the user's selected deck through unchanged so the Kotlin
    // setSelectedDeck() call has the right input.
    useSettingsStore.setState({ selectedDeck: 'A Different Deck' });
    mockNativeGetDueCards.mockResolvedValueOnce([makeNativeCard(301)]);

    await sessionManager.startSession();

    expect(mockNativeGetDueCards).toHaveBeenCalledWith('A Different Deck');
  });
});
