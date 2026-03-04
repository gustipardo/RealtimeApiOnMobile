# Story 1.2: Scaffold Zustand Stores and TypeScript Types

Status: done

## Story

As a developer,
I want the core Zustand stores and TypeScript type definitions created with their interfaces,
so that all subsequent epics have a consistent state management foundation.

## Acceptance Criteria

1. **Given** the initialized Expo project from Story 1.1 **When** the stores and types are created **Then** `src/stores/useSessionStore.ts` exists with SessionPhase type (all states: idle, loading_cards, connecting, ready, asking_question, awaiting_answer, evaluating, giving_feedback, advancing, session_complete, paused, reconnecting, error) and transitionTo, recordAnswer, advanceCard, resetSession actions
2. **Given** the stores are created **When** `src/stores/useCardCacheStore.ts` is examined **Then** it has setCards, getNextCard, getCurrentCard, clear actions
3. **Given** the stores are created **When** `src/stores/useConnectionStore.ts` is examined **Then** it has WebRTC connection state tracking
4. **Given** the stores are created **When** `src/stores/useSettingsStore.ts` is examined **Then** it uses persist middleware (AsyncStorage) for selectedDeck, onboardingCompleted, apiKeyStored flag
5. **Given** the types are created **When** `src/types/anki.ts` is examined **Then** it defines AnkiCard, DeckInfo, BridgeError interfaces
6. **Given** the types are created **When** `src/types/session.ts` is examined **Then** it defines SessionPhase, SessionTransition, SessionStats types
7. **Given** the types are created **When** `src/types/ai.ts` is examined **Then** it defines EvaluateAndMoveNextResult and tool function types
8. **Given** tests exist **When** unit tests run **Then** useSessionStore (phase transitions) and useCardCacheStore (card queue operations) tests pass

## Tasks / Subtasks

- [x] Task 1: Create TypeScript type definitions (AC: #5, #6, #7)
  - [x] Create `src/types/anki.ts` with AnkiCard, DeckInfo, BridgeError interfaces
  - [x] Create `src/types/session.ts` with SessionPhase, SessionTransition, SessionStats types
  - [x] Create `src/types/ai.ts` with EvaluateAndMoveNextResult and tool function types
- [x] Task 2: Create useSessionStore (AC: #1)
  - [x] Create `src/stores/useSessionStore.ts` with SessionPhase FSM state, currentCardIndex, stats
  - [x] Implement transitionTo, recordAnswer, advanceCard, resetSession actions
  - [x] Import SessionPhase from `src/types/session.ts` — do NOT redefine it
- [x] Task 3: Create useCardCacheStore (AC: #2)
  - [x] Create `src/stores/useCardCacheStore.ts` with cards array and index tracking
  - [x] Implement setCards, getNextCard, getCurrentCard, clear actions
  - [x] Import AnkiCard from `src/types/anki.ts`
- [x] Task 4: Create useConnectionStore (AC: #3)
  - [x] Create `src/stores/useConnectionStore.ts` with WebRTC connection state
  - [x] Track connectionState, reconnectAttempts, networkStatus
- [x] Task 5: Create useSettingsStore with persist (AC: #4)
  - [x] Create `src/stores/useSettingsStore.ts` with persist middleware using AsyncStorage
  - [x] Fields: selectedDeck, onboardingCompleted, apiKeyStored
  - [x] Use `createJSONStorage(() => AsyncStorage)` for storage adapter
- [x] Task 6: Write unit tests (AC: #8)
  - [x] Install jest-expo, jest, @types/jest, babel-preset-expo, @babel/preset-env, @babel/preset-typescript
  - [x] Create `src/stores/__tests__/useSessionStore.test.ts` — 12 tests for phase transitions, recordAnswer, advanceCard, resetSession
  - [x] Create `src/stores/__tests__/useCardCacheStore.test.ts` — 10 tests for card queue operations
  - [x] All 22 tests pass

## Dev Notes

### Type Definitions — Exact Interfaces Required

From architecture.md, these are the exact type definitions:

```typescript
// src/types/anki.ts
interface AnkiCard {
  cardId: number;
  front: string;       // HTML stripped by cleanAnkiText before use
  back: string;
  deckName: string;
}

interface DeckInfo {
  deckName: string;
  dueCount: number;
}

interface BridgeError {
  code: 'ANKIDROID_NOT_INSTALLED' | 'PERMISSION_DENIED' | 'NO_DECKS' | 'QUERY_FAILED';
  message: string;
}
```

```typescript
// src/types/session.ts
type SessionPhase =
  | 'idle'
  | 'loading_cards'
  | 'connecting'
  | 'ready'
  | 'asking_question'
  | 'awaiting_answer'
  | 'evaluating'
  | 'giving_feedback'
  | 'advancing'
  | 'session_complete'
  | 'paused'
  | 'reconnecting'
  | 'error';

interface SessionTransition {
  from: SessionPhase;
  to: SessionPhase;
  trigger: string;
}

interface SessionStats {
  correct: number;
  incorrect: number;
}
```

```typescript
// src/types/ai.ts
interface EvaluateAndMoveNextResult {
  status: 'success' | 'session_complete';
  answered_card_back: string;
  evaluation: 'correct' | 'incorrect';
  next_card?: {
    front: string;
    back: string;
  };
  progress: {
    completed: number;
    total: number;
  };
}
```

### Store Pattern — Architecture Mandated

From architecture.md, the exact store interface pattern:

```typescript
// useSessionStore pattern
interface SessionStore {
  phase: SessionPhase;
  currentCardIndex: number;
  stats: SessionStats;
  transitionTo: (phase: SessionPhase, trigger: string) => void;
  recordAnswer: (evaluation: 'correct' | 'incorrect') => void;
  advanceCard: () => void;
  resetSession: () => void;
}
```

```typescript
// useSettingsStore pattern — MUST use persist middleware
const useSettingsStore = create(
  persist<SettingsStore>(
    (set) => ({ /* ... */ }),
    { name: 'settings-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

### Critical Rules

- **Naming:** Store files use `use[Domain]Store.ts` pattern (camelCase with `use` prefix)
- **Types location:** All shared types in `src/types/` — stores import from there, never redefine
- **No business logic in stores:** Actions are simple state setters. Complex logic goes in services (Story 3.x)
- **No `I` prefix on interfaces:** Use `AnkiCard` not `IAnkiCard`
- **SessionPhase is a string literal union, NOT an enum**
- **Only useSettingsStore gets persist middleware** — other stores are in-memory only
- **Export all types and interfaces** for use by other modules

### Testing Approach

- Use Zustand's vanilla store API for testing (no React rendering needed)
- Test `useSessionStore`: verify transitionTo changes phase, recordAnswer increments stats, resetSession clears state
- Test `useCardCacheStore`: verify setCards populates, getCurrentCard returns current, getNextCard advances, clear empties

### Previous Story (1.1) Learnings

- react-native-webrtc required `--legacy-peer-deps` — be aware of peer dep issues
- Node 18 on dev machine blocks Metro/build — tests should work since they don't need Metro
- NativeWind and Expo Router are configured — no changes needed to config files
- Project uses `src/` directory with Expo Router in `src/app/`
- `@react-native-async-storage/async-storage` is already installed (needed for Zustand persist)

### Project Structure Notes

Files to create in this story:
```
src/
├── types/
│   ├── anki.ts
│   ├── session.ts
│   └── ai.ts
├── stores/
│   ├── useSessionStore.ts
│   ├── useCardCacheStore.ts
│   ├── useConnectionStore.ts
│   ├── useSettingsStore.ts
│   └── __tests__/
│       ├── useSessionStore.test.ts
│       └── useCardCacheStore.test.ts
```

### References

- [Source: architecture.md#Zustand Store Patterns] — Store interface and action patterns
- [Source: architecture.md#State Machine Transition Format] — SessionPhase type definition
- [Source: architecture.md#Native Bridge Return Types] — AnkiCard, BridgeError interfaces
- [Source: architecture.md#Tool Function Response Format] — EvaluateAndMoveNextResult
- [Source: architecture.md#Code Naming Conventions] — File and type naming rules
- [Source: architecture.md#Complete Project Directory Structure] — File placement
- [Source: architecture.md#Anti-Patterns to Avoid] — useState vs stores, typed errors

### Anti-Patterns to Avoid

- Do NOT use `useState` for any state that belongs in stores
- Do NOT create enums — use string literal unions for SessionPhase
- Do NOT put persist middleware on stores other than useSettingsStore
- Do NOT add business logic (validation, side effects) to store actions — that's for services
- Do NOT import `NativeModules` directly anywhere — that's for ankiBridge (Story 1.3)
- Do NOT use `I` prefix on interfaces

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- `nativewind/babel` plugin incompatible with jest — returns `.plugins` object that @babel/core rejects. Fixed by conditionally excluding NativeWind from babel config when `NODE_ENV=test`
- `react-native-worklets` required as devDependency for react-native-reanimated babel plugin
- All npm installs required `--legacy-peer-deps` due to react-dom peer dep conflict

### Completion Notes List
- All 3 type definition files created with exact interfaces from architecture.md
- All 4 Zustand stores created following architecture-mandated patterns
- useSettingsStore uses persist middleware with AsyncStorage as specified
- SessionPhase implemented as string literal union (not enum) per architecture
- jest configured with conditional babel config to work alongside NativeWind
- 22 tests pass: 12 for useSessionStore, 10 for useCardCacheStore
- All 8 acceptance criteria satisfied

### File List
- `src/types/anki.ts` — NEW: AnkiCard, DeckInfo, BridgeError interfaces
- `src/types/session.ts` — NEW: SessionPhase, SessionTransition, SessionStats types
- `src/types/ai.ts` — NEW: EvaluateAndMoveNextResult interface
- `src/stores/useSessionStore.ts` — NEW: FSM state store with 4 actions
- `src/stores/useCardCacheStore.ts` — NEW: card queue store with 4 actions
- `src/stores/useConnectionStore.ts` — NEW: WebRTC connection state store
- `src/stores/useSettingsStore.ts` — NEW: persisted settings store (AsyncStorage)
- `src/stores/__tests__/useSessionStore.test.ts` — NEW: 12 unit tests
- `src/stores/__tests__/useCardCacheStore.test.ts` — NEW: 10 unit tests
- `jest.config.js` — NEW: jest config with node env and babel presets
- `babel.config.js` — MODIFIED: conditional NativeWind exclusion for test env
- `package.json` — MODIFIED: added test script, jest/babel devDependencies
