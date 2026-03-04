---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-02-01'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/research/technical-anki-mobile-sync-patterns-research-2026-01-19.md'
  - 'docs/index.md'
  - 'docs/project-overview.md'
  - 'docs/architecture.md'
  - 'docs/component-inventory.md'
  - 'docs/development-guide.md'
  - 'docs/source-tree-analysis.md'
workflowType: 'architecture'
project_name: 'APIxAnkiOnMobile'
user_name: 'Tobias'
date: '2026-02-01'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (38 total):**

| Capability Area | Count | Architectural Implication |
|---|---|---|
| Voice Study Session | 12 | Core interaction loop - WebRTC + state machine |
| Anki Integration | 5 | Native Kotlin module for ContentProvider |
| Background Audio & Session Persistence | 5 | Android Foreground Service + notification controls |
| Network Resilience | 5 | WebRTC lifecycle management + session state persistence |
| Onboarding & Setup | 6 | Permission flow + AnkiDroid detection |
| Error Handling | 4 | Graceful degradation at system boundaries |
| Visual Companion | 1 | Optional UI layer alongside audio-primary session |

**Non-Functional Requirements (18 total) - Architecture Drivers:**

| NFR | Architectural Impact |
|---|---|
| NFR1: <2s P95 voice latency | Minimize JS-native bridge hops; preload next card during feedback |
| NFR3: <5s session startup | Parallel initialization: WebRTC connect + card cache load |
| NFR5: Secure API key storage | Android Keystore or Expo SecureStore |
| NFR7: In-memory card cache | Load all due cards at session start; no on-demand fetching |
| NFR12: AnkiDroid API v1.1.0 | Pin native module to specific API version |
| NFR13: Handle API connection drops | WebRTC reconnection logic with session state preservation |
| NFR15: 99%+ crash-free sessions | State machine prevents invalid transitions; explicit cleanup |
| NFR16-18: Survive backgrounding/screen lock/lifecycle | Foreground Service decouples audio from Activity lifecycle |

**Scale & Complexity:**

- Primary domain: Mobile (React Native Expo + Kotlin native modules)
- Complexity level: Medium
- Estimated architectural components: ~12 (3 native modules, 4 services, 3 state managers, 2 UI screens)

### Technical Constraints & Dependencies

| Constraint | Source | Impact |
|---|---|---|
| AnkiDroid must be installed | FR28, external dependency | Onboarding gate; cannot function without it |
| Internet required | NFR13, OpenAI dependency | No offline study sessions in MVP |
| Android 8.0+ (API 26) | PRD platform requirement | Foreground Service notification channel required |
| React Native + Expo | PRD framework decision | Limits native module patterns to Expo modules or bare workflow |
| OpenAI Realtime API (WebRTC) | Core product dependency | Single vendor lock; latency dependent on OpenAI infrastructure |
| Custom Kotlin native bridge | ContentProvider access | Cannot use pure JS; adds build complexity |

### Cross-Cutting Concerns Identified

| Concern | Affected Components | Strategy Needed |
|---|---|---|
| **Session state machine** | Voice session, network resilience, background audio, UI | Central FSM governing all session transitions |
| **Audio lifecycle** | WebRTC, foreground service, audio focus, screen off | Audio manager coordinating all audio sources/sinks |
| **Native bridge error propagation** | AnkiDroid module, foreground service module | Consistent error types flowing from Kotlin → JS |
| **WebRTC connection management** | Voice session, network resilience, reconnection | Connection manager with retry logic and state tracking |
| **Card data pipeline** | AnkiDroid read → cache → AI context → evaluation | Data flow from native ContentProvider through to OpenAI tool calls |

### Web Prototype Patterns to Preserve

| Pattern | Source | Adaptation Needed |
|---|---|---|
| `evaluate_and_move_next` tool function | useRealtimeSession.ts | Keep atomic turn handling; add card cache integration |
| Hooks + Services + UI separation | App architecture | Map to React Native navigation + services |
| `cleanAnkiText` HTML stripping | textUtils.ts | Directly reusable |
| WebRTC via @openai/agents SDK | useRealtimeSession.ts | Verify React Native compatibility; may need react-native-webrtc |

### Web Prototype Bugs to Solve by Architecture

| Bug | Root Cause | Architectural Solution |
|---|---|---|
| UI/Voice race conditions | No state synchronization | Session state machine with explicit transitions |
| Incomplete feedback loop | AI discretion on answer reveal | Force reveal in tool response data, not AI prompt |
| Zombie sessions | Missing WebRTC cleanup | Explicit teardown in state machine exit states |
| Excessive hinting | Prompt-only enforcement | Gate hint logic in code (tool function constraints) |

## Starter Template Evaluation

### Primary Technology Domain

Mobile app (React Native / Expo) based on PRD requirements for voice-first Android study application with native module integration.

### Starter Options Considered

| Option | Verdict | Reason |
|---|---|---|
| `create-expo-app` blank-typescript | **Selected** | Most documented, config plugin ecosystem, dev build workflow |
| `rn-new --nativewind` | Viable alternative | Pre-configures NativeWind but less documented |
| Bare React Native CLI | Rejected | Unnecessary build complexity for this project |

### Selected Starter: Expo blank-typescript

**Rationale:** Expo provides managed native builds via EAS, config plugin support for react-native-webrtc, and a proven development build workflow (`expo-dev-client`) that enables native Kotlin modules without ejecting. Developer already has React + TypeScript experience from web prototype.

**Initialization Command:**

```bash
npx create-expo-app@latest APIxAnkiOnMobile --template blank-typescript
```

**Post-Init Setup:**

```bash
# NativeWind (TailwindCSS for RN)
npx expo install nativewind react-native-reanimated react-native-safe-area-context
npm install -D tailwindcss@^3.4.17

# State Management
npm install zustand@^5.0.10

# WebRTC (OpenAI Realtime API)
npx expo install react-native-webrtc @config-plugins/react-native-webrtc

# Secure Storage (API key)
npx expo install expo-secure-store

# Development Build (required for native modules)
npx expo install expo-dev-client
```

### Architectural Decisions Provided by Starter

**Language & Runtime:**
- TypeScript 5.x with strict mode
- Hermes JavaScript engine (default on Expo SDK 54)
- React 19 + React Native

**Styling Solution:**
- NativeWind v4.1 (TailwindCSS 3.4 utility classes compiled to React Native StyleSheet)
- Developer carries over TailwindCSS knowledge from web prototype

**Build Tooling:**
- Metro bundler (replaces Vite from web prototype)
- EAS Build for native binaries
- Expo config plugins for native module integration

**State Management:**
- Zustand v5.0.10 (lightweight, hook-based, supports persistence middleware)
- Replaces web prototype's useState/hook pattern with centralized stores

**Routing:**
- Expo Router (file-based routing)
- Minimal screens needed: Onboarding → Deck Selection → Study Session

**Development Experience:**
- Expo dev client for native module testing on physical device
- Fast Refresh (HMR equivalent)
- Expo Go not usable (native modules required) - development builds only

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

1. Session state machine pattern (governs all voice/audio/UI coordination)
2. Native bridge architecture (AnkiDroid ContentProvider access pattern)
3. WebRTC integration approach (OpenAI Realtime API on React Native)
4. Background audio service design (Foreground Service architecture)
5. Card data pipeline (read path from AnkiDroid → in-memory cache → AI context)

**Important Decisions (Shape Architecture):**

6. Error handling and native bridge error propagation
7. Network resilience and reconnection strategy
8. Notification controls integration
9. Onboarding flow architecture

**Deferred Decisions (Post-MVP):**

- Bidirectional sync (review history back to Anki) — Phase 2
- iOS support and file-based .apkg sync — Phase 3
- Offline voice processing — Phase 3
- Analytics and crash reporting provider — post-launch

### Data Architecture

**Decision: No persistent database in MVP**

- **Rationale:** The app does not create cards or store review history. It reads cards from AnkiDroid at session start, caches them in memory for the session, and discards them on session end. NFR7 explicitly requires in-memory-only card caching.
- **Card Cache:** Zustand store holding all due cards loaded at session start. No SQLite, no disk persistence for card data.
- **Session State:** Zustand store with `persist` middleware (AsyncStorage) for minimal session recovery data: current card index, session stats, selected deck name. This enables resume after process kill (NFR18).
- **Settings/Preferences:** Zustand store with `persist` middleware for API key reference (actual key in expo-secure-store), selected deck, onboarding completion flag.
- **Affects:** All session-related components, network resilience, background audio

**Decision: AnkiDroid ContentProvider as sole card data source**

- **Version:** AnkiDroid API v1.1.0 (latest available, pinned per NFR12)
- **Rationale:** PRD requires AnkiDroid integration. The ContentProvider API is well-documented for reads: deck listing, card content, due queue. Research confirmed no newer API version exists as of early 2026.
- **Read Operations Used:** `deckNames`, `findCards`, `findDueCards`, `cardsInfo`
- **Write Operations Used (MVP):** None — MVP is read-only. The app reads and reviews cards but does not write review results back to AnkiDroid. This is explicitly out of MVP scope per PRD.
- **Post-Session:** Trigger AnkiDroid sync via broadcast intent so user's other devices stay current (FR16)
- **Affects:** Native bridge module, onboarding flow, card cache loading

### Authentication & Security

**Decision: expo-secure-store for API key storage**

- **Version:** expo-secure-store v15.0.8
- **Rationale:** NFR5 requires secure API key storage. Expo SecureStore uses Android Keystore under the hood. Simple key-value API, no need for the complexity of direct Keystore access.
- **Pattern:** User enters OpenAI API key during onboarding → stored via SecureStore → retrieved at session start → passed to WebRTC connection setup → never logged or exposed in UI
- **Affects:** Onboarding flow, session connection

**Decision: No user authentication system**

- **Rationale:** NFR6 states no credentials are stored. AnkiWeb auth is handled by AnkiDroid. The app has no backend, no user accounts. API key is the only secret.
- **Affects:** Simplifies entire architecture — no auth middleware, no token refresh, no session tokens

### API & Communication Patterns

**Decision: OpenAI Realtime API via react-native-webrtc**

- **Library:** react-native-webrtc (latest) + @config-plugins/react-native-webrtc
- **Rationale:** The web prototype uses WebRTC via @openai/agents SDK. On React Native, `navigator.mediaDevices` is unavailable. react-native-webrtc provides the WebRTC primitives. The @openai/agents SDK may not work directly in React Native — the native module provides `RTCPeerConnection`, `mediaDevices`, etc. that the connection logic needs.
- **Integration Pattern:** Custom WebRTC connection manager (not the @openai/agents SDK wrapper) that directly creates `RTCPeerConnection`, handles SDP offer/answer with OpenAI's `/v1/realtime` endpoint, and manages audio tracks.
- **Audio Input:** react-native-webrtc's `mediaDevices.getUserMedia({ audio: true })` for microphone access
- **Audio Output:** WebRTC remote audio track routed through the Foreground Service audio session
- **Affects:** Core session hook, audio manager, foreground service

**Decision: Tool function pattern preserved from web prototype**

- **Pattern:** `evaluate_and_move_next` tool function — atomic: grade current card AND return next card in one call
- **Adaptation:** Tool function reads from Zustand card cache instead of making AnkiConnect HTTP calls. Returns `answered_card_back` (correct answer for feedback) and `next_card` from cache.
- **Enhancement:** Add `session_complete` flag when no more cards remain, triggering session completion summary
- **Affects:** AI system prompt, session state machine, card cache store

### Frontend Architecture

**Decision: Zustand stores organized by domain**

- **Version:** Zustand v5.0.10
- **Store Layout:**
  - `useSessionStore` — Session FSM state, current card, evaluation result, card queue position, stats (correct/incorrect counts)
  - `useCardCacheStore` — All due cards loaded from AnkiDroid at session start, indexed for O(1) lookup
  - `useConnectionStore` — WebRTC connection state, reconnection attempts, network status
  - `useSettingsStore` (persisted) — Selected deck, onboarding completed, API key reference, preferences
- **Rationale:** Zustand's lightweight API and middleware support (persist, devtools) match the project's needs. Multiple small stores over one monolithic store — each store maps to a cross-cutting concern identified in step 2.
- **Affects:** All UI components, session management, background service communication

**Decision: Expo Router file-based routing with 3 screens**

- **Screens:**
  - `/(onboarding)` — AnkiDroid detection, permission grant, API key entry, deck selection (FR28-FR33)
  - `/(main)/deck-select` — Deck selection for returning users (FR17)
  - `/(main)/session` — Active study session with visual companion (FR38), minimal UI during voice-primary interaction
- **Navigation Pattern:** Stack navigation. Onboarding is a one-time gate (redirect to main after completion). Session screen uses `presentation: 'fullScreenModal'` to prevent back navigation during active session.
- **Affects:** App layout, onboarding flow, session lifecycle

**Decision: NativeWind v4.2+ for styling**

- **Version:** NativeWind v4.2.0+ with TailwindCSS v3.4.17
- **Rationale:** Developer carries TailwindCSS knowledge from web prototype. NativeWind v4.2+ required for Expo SDK 54 / Reanimated v4 compatibility. Not using NativeWind v5 (still preview).
- **Constraint:** Must use `tailwindcss@^3.4.17` (not v4.x). No PostCSS config needed for Expo projects.
- **Affects:** All UI components

### Infrastructure & Deployment

**Decision: EAS Build + local development builds**

- **Build Pipeline:** EAS Build (Expo Application Services) for producing APK/AAB
- **Local Dev:** `npx expo run:android` for development builds on physical device (required — Expo Go cannot run native modules)
- **Distribution (MVP):** Internal distribution via EAS for beta testing. Google Play Store for public launch.
- **Affects:** CI/CD, testing workflow

**Decision: No backend infrastructure**

- **Rationale:** The app is fully client-side. OpenAI API calls go directly from device to OpenAI. AnkiDroid data is accessed locally via ContentProvider. No server, no database, no cloud functions.
- **Implication:** API key is stored on device. Usage costs are borne by the user's own OpenAI account. No analytics backend in MVP.
- **Affects:** Simplifies deployment, eliminates backend operational concerns

**Decision: Minimal monitoring in MVP**

- **Crash Reporting:** Deferred to post-launch. Use Expo's built-in error boundary for graceful crash recovery during sessions.
- **Logging:** Debug-only logging (similar to web prototype's DebugPanel). Stripped in production builds.
- **Rationale:** Solo developer, MVP validation phase. Add Sentry or similar after validating core hypothesis.

### Decision Impact Analysis

**Implementation Sequence:**

1. **Project scaffolding** — Expo init, install dependencies, config plugins
2. **Native bridge module** — Kotlin module for AnkiDroid ContentProvider (read-only: decks, cards, due queue)
3. **Session state machine** — Zustand store + FSM governing all session transitions
4. **WebRTC connection manager** — react-native-webrtc integration with OpenAI Realtime API
5. **Foreground Service** — Background audio, notification controls, audio focus handling
6. **Card data pipeline** — Load due cards → cache → feed to AI tool function
7. **UI screens** — Onboarding, deck selection, session (minimal — voice-primary)
8. **Network resilience** — Reconnection logic, session resume
9. **Polish** — Error handling, edge cases, onboarding UX

**Cross-Component Dependencies:**

```
Native Bridge Module ──► Card Cache Store ──► Tool Function ──► AI Session
                                                    │
Session State Machine ◄────────────────────────────┘
       │
       ├──► Connection Store (WebRTC state)
       ├──► Foreground Service (audio lifecycle)
       └──► UI Screens (visual companion)
```

- The **session state machine** is the central coordinator — every other component reacts to state transitions
- The **native bridge** must be built first since card data feeds everything downstream
- The **WebRTC manager** and **foreground service** can be developed in parallel once the state machine is defined
- **UI screens** are the thinnest layer — voice-primary means minimal visual UI

## Implementation Patterns & Consistency Rules

### Critical Conflict Points Identified

12 areas where AI agents could make different choices, grouped into 5 categories below.

### Naming Patterns

**Code Naming Conventions:**

| Element | Convention | Example |
|---|---|---|
| Files (components) | PascalCase.tsx | `DeckSelector.tsx` |
| Files (hooks) | camelCase with `use` prefix | `useSessionStore.ts` |
| Files (services/utils) | camelCase | `ankiBridge.ts`, `textUtils.ts` |
| Files (native modules) | PascalCase (Kotlin convention) | `AnkiDroidModule.kt` |
| Files (stores) | camelCase with `use` prefix + `Store` suffix | `useSessionStore.ts` |
| Components | PascalCase | `SessionScreen`, `DeckSelector` |
| Hooks | camelCase with `use` prefix | `useSessionStore`, `useCardCache` |
| Functions | camelCase | `loadDueCards`, `evaluateAnswer` |
| Constants | UPPER_SNAKE_CASE | `MAX_RECONNECT_ATTEMPTS`, `SESSION_STATES` |
| Types/Interfaces | PascalCase, no `I` prefix | `SessionState`, `AnkiCard`, `DeckInfo` |
| Enums | PascalCase name, PascalCase members | `SessionPhase.StudyActive` |
| Zustand stores | `use[Domain]Store` | `useSessionStore`, `useConnectionStore` |
| Native module methods | camelCase (JS side), camelCase (Kotlin `@ReactMethod`) | `getDueCards()` |

**Kotlin Native Module Naming:**

| Element | Convention | Example |
|---|---|---|
| Module class | PascalCase + `Module` suffix | `AnkiDroidModule` |
| Package class | PascalCase + `Package` suffix | `AnkiDroidPackage` |
| Methods exposed to JS | camelCase | `getDeckNames`, `getDueCards` |
| Internal Kotlin methods | camelCase | `queryContentProvider` |
| Constants | UPPER_SNAKE_CASE | `ANKIDROID_AUTHORITY` |

### Structure Patterns

**Project Organization: Feature-first with shared layer**

```
src/
├── app/                          # Expo Router screens (file-based routing)
│   ├── (onboarding)/
│   │   └── index.tsx             # Onboarding flow
│   ├── (main)/
│   │   ├── deck-select.tsx       # Deck selection
│   │   └── session.tsx           # Active study session
│   └── _layout.tsx               # Root layout
├── components/                   # Shared UI components
│   ├── SessionControls.tsx
│   ├── CardDisplay.tsx
│   └── StatusIndicator.tsx
├── stores/                       # Zustand stores (one file per store)
│   ├── useSessionStore.ts
│   ├── useCardCacheStore.ts
│   ├── useConnectionStore.ts
│   └── useSettingsStore.ts
├── services/                     # Business logic, external integrations
│   ├── webrtcManager.ts          # WebRTC connection lifecycle
│   ├── sessionStateMachine.ts    # FSM definition and transitions
│   └── audioManager.ts           # Audio focus, routing
├── native/                       # JS-side native module wrappers
│   └── ankiBridge.ts             # Typed wrapper around AnkiDroidModule
├── utils/                        # Pure utility functions
│   ├── textUtils.ts              # cleanAnkiText (from web prototype)
│   └── constants.ts              # App-wide constants
├── types/                        # Shared TypeScript types
│   ├── anki.ts                   # AnkiCard, DeckInfo, etc.
│   ├── session.ts                # SessionState, SessionPhase, etc.
│   └── ai.ts                     # ToolFunction params/results
└── config/                       # App configuration
    └── prompts.ts                # AI system prompt, tool definitions
```

**Native Module Location (Expo convention):**

```
modules/
└── anki-droid/
    ├── android/
    │   └── src/main/java/expo/modules/ankidroid/
    │       ├── AnkiDroidModule.kt
    │       └── AnkiDroidPackage.kt
    └── index.ts                  # JS exports
```

**Test Organization: Co-located with source**

```
src/stores/__tests__/useSessionStore.test.ts
src/services/__tests__/sessionStateMachine.test.ts
src/utils/__tests__/textUtils.test.ts
```

**Rule:** Tests live in `__tests__/` directories adjacent to their source files. Test files mirror source file names with `.test.ts` suffix.

### Format Patterns

**Native Bridge Return Types (Kotlin → JS):**

All native bridge methods return typed objects via Promises. Error cases throw coded exceptions.

```typescript
// Good: Typed return from native bridge
interface AnkiCard {
  cardId: number;
  front: string;       // HTML stripped by cleanAnkiText before use
  back: string;
  deckName: string;
}

// Good: Consistent error from native bridge
interface BridgeError {
  code: string;        // 'ANKIDROID_NOT_INSTALLED' | 'PERMISSION_DENIED' | 'NO_DECKS' | 'QUERY_FAILED'
  message: string;     // Human-readable description
}
```

**State Machine Transition Format:**

```typescript
// Session states are string literal unions, not numeric enums
type SessionPhase =
  | 'idle'                    // No session active
  | 'loading_cards'           // Fetching due cards from AnkiDroid
  | 'connecting'              // WebRTC handshake in progress
  | 'ready'                   // Connected, waiting for user to start
  | 'asking_question'         // AI is reading the question
  | 'awaiting_answer'         // Waiting for user speech
  | 'evaluating'              // AI is processing answer
  | 'giving_feedback'         // AI is delivering feedback + correct answer
  | 'advancing'               // Moving to next card
  | 'session_complete'        // All cards reviewed, summary delivered
  | 'paused'                  // User paused or audio focus lost
  | 'reconnecting'            // Network dropped, attempting recovery
  | 'error';                  // Unrecoverable error

// Transitions are explicit — no implicit state changes
interface SessionTransition {
  from: SessionPhase;
  to: SessionPhase;
  trigger: string;     // What caused the transition
}
```

**Tool Function Response Format:**

```typescript
// Consistent with web prototype pattern
interface EvaluateAndMoveNextResult {
  status: 'success' | 'session_complete';
  answered_card_back: string;       // Correct answer for feedback
  evaluation: 'correct' | 'incorrect';
  next_card?: {                     // Absent when session_complete
    front: string;
    back: string;
  };
  progress: {
    completed: number;
    total: number;
  };
}
```

### Communication Patterns

**Zustand Store Patterns:**

```typescript
// Good: Store with explicit actions, no logic in components
interface SessionStore {
  phase: SessionPhase;
  currentCardIndex: number;
  stats: { correct: number; incorrect: number };

  // Actions (named as verbs)
  transitionTo: (phase: SessionPhase, trigger: string) => void;
  recordAnswer: (evaluation: 'correct' | 'incorrect') => void;
  advanceCard: () => void;
  resetSession: () => void;
}

// Good: Persist middleware for settings only
const useSettingsStore = create(
  persist<SettingsStore>(
    (set) => ({ /* ... */ }),
    { name: 'settings-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

**Rule:** Components read from stores via selectors. Business logic lives in services or store actions, never in components.

**Native Bridge Communication:**

```typescript
// Good: Thin typed wrapper in src/native/ankiBridge.ts
import { NativeModules } from 'react-native';
const { AnkiDroidModule } = NativeModules;

export const ankiBridge = {
  getDeckNames: (): Promise<string[]> => AnkiDroidModule.getDeckNames(),
  getDueCards: (deckName: string): Promise<AnkiCard[]> => AnkiDroidModule.getDueCards(deckName),
  isAnkiDroidInstalled: (): Promise<boolean> => AnkiDroidModule.isInstalled(),
  triggerSync: (): Promise<void> => AnkiDroidModule.triggerSync(),
};
```

**Rule:** Never call `NativeModules` directly from components or stores. Always go through the typed wrapper in `src/native/`.

### Process Patterns

**Error Handling:**

| Error Source | Pattern | User Communication |
|---|---|---|
| Native bridge (AnkiDroid) | Catch in bridge wrapper, throw typed `BridgeError` | Spoken error message via AI or notification |
| WebRTC connection | Catch in connection manager, transition FSM to `reconnecting` or `error` | Spoken: "Connection lost. Trying to reconnect." |
| Tool function failure | Return error in tool result, AI handles gracefully | AI speaks the error context |
| Unhandled exception | React Error Boundary catches, transitions to `error` | Screen shows "Something went wrong" + restart button |

**Rule:** Errors at system boundaries (native bridge, WebRTC, network) are caught and converted to typed errors. Internal logic errors should crash loudly in development.

**Loading State Pattern:**

- Loading states live in the relevant Zustand store, not in components
- Loading is implicit in `SessionPhase` (e.g., `loading_cards`, `connecting`, `evaluating`)
- No separate `isLoading` booleans — the FSM phase IS the loading state
- UI derives loading indicators from phase: `phase === 'loading_cards'`

**Retry Pattern:**

```typescript
// Connection retry: exponential backoff, max 3 attempts
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
} as const;
```

**Rule:** Retry logic lives in the service layer (webrtcManager, ankiBridge), not in stores or components.

### Enforcement Guidelines

**All AI Agents MUST:**

1. Follow the naming conventions table exactly — no exceptions for "personal preference"
2. Place new files in the directory structure defined above — ask if unsure where something goes
3. Use `SessionPhase` string literals for all session state — never introduce ad-hoc boolean flags like `isPlaying`, `isListening`
4. Route all AnkiDroid calls through `src/native/ankiBridge.ts` — never import NativeModules directly
5. Keep components thin — no business logic, no direct service calls, only store reads and action dispatches
6. Use the typed error patterns — never swallow errors with empty catch blocks
7. Write tests for stores and services — components are tested indirectly through integration tests

**Anti-Patterns to Avoid:**

| Anti-Pattern | Why It's Bad | Do This Instead |
|---|---|---|
| `useState` for session state in components | Creates race conditions (web prototype bug) | Use `useSessionStore` |
| Direct `NativeModules.AnkiDroidModule.x()` calls | Untyped, scattered, hard to mock in tests | Use `ankiBridge` wrapper |
| Boolean flags like `isConnected && !isReconnecting` | Combinatorial explosion, impossible states | Use `SessionPhase` enum |
| `try/catch` with `console.log(e)` | Swallowed errors, invisible failures | Throw typed errors, handle in FSM |
| Inline styles or `StyleSheet.create` | Inconsistent with NativeWind decision | Use NativeWind className |
| Business logic in `useEffect` | Hard to test, hidden side effects | Extract to service functions |

## Project Structure & Boundaries

### Complete Project Directory Structure

```
APIxAnkiOnMobile/
├── app.json                          # Expo app config (plugins, permissions)
├── app.config.ts                     # Dynamic Expo config (if needed)
├── package.json
├── tsconfig.json
├── tailwind.config.js                # TailwindCSS 3.4 config for NativeWind
├── metro.config.js                   # Metro bundler config (WebRTC shim resolution)
├── babel.config.js                   # Babel config (NativeWind preset)
├── .env.example                      # Documents required env vars (if any)
├── .gitignore
├── eas.json                          # EAS Build configuration
│
├── modules/                          # Expo native modules
│   └── anki-droid/
│       ├── android/
│       │   └── src/main/java/expo/modules/ankidroid/
│       │       ├── AnkiDroidModule.kt       # ContentProvider access methods
│       │       └── AnkiDroidPackage.kt      # Module registration
│       ├── expo-module.config.json          # Expo module manifest
│       └── index.ts                         # JS exports + types
│
├── android/                          # Auto-generated by expo prebuild
│   └── app/
│       └── src/main/
│           ├── AndroidManifest.xml   # Permissions added via config plugin
│           └── java/.../             # Foreground Service (if not using expo module)
│
├── src/
│   ├── app/                          # Expo Router (file-based routing)
│   │   ├── _layout.tsx               # Root layout: providers, global error boundary
│   │   ├── (onboarding)/
│   │   │   ├── _layout.tsx           # Onboarding stack layout
│   │   │   ├── index.tsx             # Welcome + AnkiDroid detection (FR28-29)
│   │   │   ├── permissions.tsx       # Permission grant flow (FR30-31)
│   │   │   └── api-key.tsx           # OpenAI API key entry (NFR5)
│   │   └── (main)/
│   │       ├── _layout.tsx           # Main stack layout (redirect if not onboarded)
│   │       ├── deck-select.tsx       # Deck listing + selection (FR17, FR33)
│   │       └── session.tsx           # Active study session (FR1-12, FR38)
│   │
│   ├── components/                   # Shared UI components
│   │   ├── CardDisplay.tsx           # Visual companion card view (FR38)
│   │   ├── SessionSummary.tsx        # End-of-session stats (FR12)
│   │   ├── DeckList.tsx              # Deck list with due counts
│   │   ├── StatusIndicator.tsx       # Connection/session status badge
│   │   └── ErrorBoundary.tsx         # Graceful crash recovery
│   │
│   ├── stores/                       # Zustand stores
│   │   ├── useSessionStore.ts        # FSM state, card position, stats
│   │   ├── useCardCacheStore.ts      # Due cards loaded from AnkiDroid
│   │   ├── useConnectionStore.ts     # WebRTC state, network status
│   │   ├── useSettingsStore.ts       # Persisted: deck, onboarding, API key ref
│   │   └── __tests__/
│   │       ├── useSessionStore.test.ts
│   │       ├── useCardCacheStore.test.ts
│   │       └── useConnectionStore.test.ts
│   │
│   ├── services/                     # Business logic layer
│   │   ├── sessionStateMachine.ts    # FSM transitions, guards, side effects
│   │   ├── webrtcManager.ts          # RTCPeerConnection lifecycle, SDP, ICE
│   │   ├── audioManager.ts           # Audio focus, routing, foreground service comm
│   │   ├── cardLoader.ts             # Load due cards from native bridge → cache
│   │   └── __tests__/
│   │       ├── sessionStateMachine.test.ts
│   │       └── webrtcManager.test.ts
│   │
│   ├── native/                       # JS wrappers for native modules
│   │   └── ankiBridge.ts             # Typed API over AnkiDroidModule
│   │
│   ├── utils/                        # Pure utility functions
│   │   ├── textUtils.ts              # cleanAnkiText (ported from web prototype)
│   │   ├── constants.ts              # App-wide constants, retry config
│   │   └── __tests__/
│   │       └── textUtils.test.ts
│   │
│   ├── types/                        # Shared TypeScript types
│   │   ├── anki.ts                   # AnkiCard, DeckInfo, BridgeError
│   │   ├── session.ts                # SessionPhase, SessionTransition, SessionStats
│   │   └── ai.ts                     # Tool function params/results, system prompt types
│   │
│   └── config/                       # App configuration
│       ├── prompts.ts                # AI system prompt, tool definitions
│       └── permissions.ts            # Android permission request helpers
│
├── assets/                           # Static assets (app icon, splash)
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
│
└── docs/                             # Carried over from web prototype
    └── ...                           # Existing project documentation
```

### Architectural Boundaries

**Native Bridge Boundary:**

```
JS World                          │  Kotlin World
──────────────────────────────────┼───────────────────────────
src/native/ankiBridge.ts          │  modules/anki-droid/android/
  ↑ Only entry point to native    │    AnkiDroidModule.kt
  ↑ Returns Promise<typed result> │    Queries ContentProvider
  ↑ Catches and types all errors  │    Returns ReadableMap/Array
```

- **Rule:** Nothing in `src/` imports from `modules/` directly except `ankiBridge.ts`
- **Rule:** Native module returns serializable data only (no ContentProvider cursors crossing the bridge)

**Store Boundary:**

```
Components (read-only)  →  Stores (state + actions)  →  Services (side effects)
       ↑ subscribe               ↑ call actions                ↑ pure logic
       ↑ NO direct service       ↑ dispatch to services        ↑ return results
         calls                     when needed
```

- **Rule:** Components never call services directly. They dispatch store actions which may invoke services.
- **Rule:** Services are pure(ish) — they take inputs and return outputs. Side effects (network, native bridge) happen inside services, not stores.

**Data Flow Boundary (Card Pipeline):**

```
AnkiDroid ContentProvider
    ↓ (native bridge)
ankiBridge.getDueCards(deckName)
    ↓ (typed AnkiCard[])
cardLoader.loadDueCards() → cleanAnkiText on each card
    ↓ (cleaned AnkiCard[])
useCardCacheStore.setCards(cards)
    ↓ (store holds all cards)
useSessionStore.advanceCard() → reads next from cache
    ↓ (current card)
Tool function reads from store → returns to AI
    ↓
AI speaks question/feedback
```

### Requirements to Structure Mapping

| FR Category | Primary Location | Supporting Files |
|---|---|---|
| **Voice Study Session (FR1-12)** | `src/app/(main)/session.tsx` | `stores/useSessionStore.ts`, `services/sessionStateMachine.ts`, `services/webrtcManager.ts`, `config/prompts.ts` |
| **Anki Integration (FR13-17)** | `modules/anki-droid/`, `src/native/ankiBridge.ts` | `services/cardLoader.ts`, `stores/useCardCacheStore.ts` |
| **Background Audio (FR18-22)** | `modules/anki-droid/android/` (Foreground Service) | `services/audioManager.ts`, `stores/useSessionStore.ts` |
| **Network Resilience (FR23-27)** | `services/webrtcManager.ts` | `stores/useConnectionStore.ts`, `services/sessionStateMachine.ts` |
| **Onboarding (FR28-33)** | `src/app/(onboarding)/` | `src/native/ankiBridge.ts`, `stores/useSettingsStore.ts`, `config/permissions.ts` |
| **Error Handling (FR34-37)** | `src/components/ErrorBoundary.tsx` | `types/anki.ts` (BridgeError), all services |
| **Visual Companion (FR38)** | `src/components/CardDisplay.tsx` | `stores/useSessionStore.ts` |

### Cross-Cutting Concerns Mapping

| Concern | Files Involved |
|---|---|
| **Session State Machine** | `services/sessionStateMachine.ts` (definition), `stores/useSessionStore.ts` (state holder), every screen/service reads phase |
| **Audio Lifecycle** | `services/audioManager.ts`, Foreground Service in `modules/`, `services/webrtcManager.ts` (audio tracks) |
| **Error Propagation** | `types/anki.ts` (BridgeError), `native/ankiBridge.ts` (catches), `services/*` (handles), `components/ErrorBoundary.tsx` (last resort) |

### External Integration Points

| Integration | Protocol | Entry Point | Error Handling |
|---|---|---|---|
| **AnkiDroid** | ContentProvider (IPC) | `modules/anki-droid/AnkiDroidModule.kt` | BridgeError codes |
| **OpenAI Realtime API** | WebRTC (HTTPS for SDP, UDP for media) | `services/webrtcManager.ts` | FSM transition to `reconnecting` or `error` |
| **expo-secure-store** | Expo API (local keychain) | `stores/useSettingsStore.ts` | Fallback to re-prompt for API key |
| **Android Foreground Service** | Service binding + notifications | `services/audioManager.ts` | Degrade to foreground-only audio |

### Development Workflow

**Local Development:**
```bash
# First time setup
npx create-expo-app@latest APIxAnkiOnMobile --template blank-typescript
# Install dependencies (as listed in Starter Template section)
npx expo prebuild                    # Generate android/ directory
npx expo run:android                 # Build and deploy to connected device
```

**Daily Development:**
```bash
npx expo start --dev-client          # Start Metro dev server
# Open app on device → Fast Refresh enabled
```

**Building for Distribution:**
```bash
eas build --platform android --profile preview   # Internal testing APK
eas build --platform android --profile production # Play Store AAB
```

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility:** All technology choices are compatible:
- Expo SDK 54 + react-native-webrtc (via @config-plugins/react-native-webrtc) — confirmed working with dev client builds
- NativeWind v4.2+ requires TailwindCSS v3.4.17 (not v4.x) — correctly specified
- Zustand v5.0.10 + React 19 — confirmed compatible
- expo-secure-store v15.0.8 — works with Expo SDK 54
- Custom Kotlin native module (Expo Modules API) — standard pattern for Expo dev builds

**One compatibility note:** react-native-webrtc has a known `event-target-shim@5` vs `@6` conflict requiring a Metro resolver workaround. This is documented and handled via the config plugin. The `metro.config.js` in project structure accounts for this.

**Pattern Consistency:** All patterns align:
- Zustand stores follow consistent `use[Domain]Store` naming
- Native bridge follows single-entry-point pattern through `ankiBridge.ts`
- FSM-based session management eliminates boolean flag conflicts
- NativeWind className usage is consistent (no mixed StyleSheet.create)

**Structure Alignment:** Project structure supports all decisions:
- `modules/anki-droid/` for Expo native module convention
- `src/stores/` with co-located tests
- `src/services/` for business logic separation from stores
- Expo Router file-based routing matches the 3-screen architecture

### Requirements Coverage Validation

**Functional Requirements Coverage (38/38):**

| FR Range | Coverage | Architectural Support |
|---|---|---|
| FR1-12 (Voice Session) | Full | Session FSM + WebRTC manager + tool function + card cache |
| FR13-17 (Anki Integration) | Full | Native bridge module + ankiBridge wrapper + cardLoader service |
| FR18-22 (Background Audio) | Full | Foreground Service + audioManager + session store persistence |
| FR23-27 (Network Resilience) | Full | Connection store + WebRTC manager reconnection + FSM `reconnecting` state |
| FR28-33 (Onboarding) | Full | Onboarding route group + ankiBridge.isInstalled + permissions config |
| FR34-37 (Error Handling) | Full | BridgeError types + ErrorBoundary + FSM `error` state |
| FR38 (Visual Companion) | Full | CardDisplay component + session store subscription |

**Non-Functional Requirements Coverage (18/18):**

| NFR | Architectural Support |
|---|---|
| NFR1 (<2s latency) | WebRTC direct connection, card preloaded in cache, minimal JS-native bridge hops |
| NFR3 (<5s startup) | Parallel init: WebRTC connect + cardLoader runs concurrently |
| NFR5 (Secure API key) | expo-secure-store (Android Keystore) |
| NFR7 (In-memory cache) | useCardCacheStore (Zustand, no persistence) |
| NFR12 (AnkiDroid API v1.1.0) | Pinned in native module gradle dependency |
| NFR13 (Connection drops) | FSM `reconnecting` state + webrtcManager retry logic |
| NFR15 (99% crash-free) | FSM prevents invalid states + ErrorBoundary + typed errors |
| NFR16-18 (Background/screen off/lifecycle) | Foreground Service decouples from Activity + settings persist middleware |

### Implementation Readiness Validation

**Decision Completeness:** All critical decisions documented with specific versions. No placeholder "TBD" entries.

**Structure Completeness:** Every FR category maps to specific files and directories. No orphaned requirements.

**Pattern Completeness:** Naming conventions cover all element types. Anti-patterns table prevents common mistakes. Enforcement guidelines give AI agents clear rules.

### Gap Analysis Results

**No Critical Gaps Found.**

**Important Gaps (addressable during implementation):**

1. **Foreground Service native module** — The architecture references it but doesn't specify whether it's a second Expo native module or part of the AnkiDroid module. **Decision:** Separate module (`modules/audio-service/`) to keep concerns separated. Can be created during the background audio epic.

2. **AI system prompt content** — `config/prompts.ts` is specified but the actual prompt text is not in this architecture doc. **Decision:** System prompt is implementation detail, not architectural. The web prototype's prompt is the starting point; refined during the voice session epic.

3. **Testing framework** — Co-located tests are specified but no test runner is chosen. **Decision:** Jest (default with Expo). No additional config needed for unit tests. E2E testing deferred to post-MVP.

**Nice-to-Have (post-MVP):**
- CI/CD pipeline definition (GitHub Actions)
- Crash reporting integration (Sentry)
- Analytics framework

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Project context thoroughly analyzed (web prototype docs, PRD, research)
- [x] Scale and complexity assessed (medium, ~12 components)
- [x] Technical constraints identified (6 constraints documented)
- [x] Cross-cutting concerns mapped (5 concerns with strategies)

**Architectural Decisions**
- [x] Critical decisions documented with versions (all 5 critical + 4 important)
- [x] Technology stack fully specified (Expo 54, RN, Zustand 5, NativeWind 4.2+)
- [x] Integration patterns defined (native bridge, WebRTC, store boundaries)
- [x] Performance considerations addressed (NFR1/3 strategies)

**Implementation Patterns**
- [x] Naming conventions established (code, Kotlin, files)
- [x] Structure patterns defined (feature-first with shared layer)
- [x] Communication patterns specified (store boundaries, native bridge wrapper)
- [x] Process patterns documented (error handling, loading states, retry)

**Project Structure**
- [x] Complete directory structure defined (all files and directories)
- [x] Component boundaries established (native, store, service boundaries)
- [x] Integration points mapped (4 external integrations)
- [x] Requirements to structure mapping complete (all 38 FRs)

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** High

**Key Strengths:**
- FSM-based session management directly solves all 4 web prototype bugs by design
- No persistent database simplifies MVP enormously (in-memory card cache only)
- No backend infrastructure — fully client-side reduces operational complexity to zero
- Native bridge is read-only for MVP — avoids the complex bidirectional sync problem entirely
- Clear separation of concerns makes each epic independently implementable

**Areas for Future Enhancement:**
- Foreground Service module will need its own architecture spike during implementation
- WebRTC + react-native-webrtc integration may surface compatibility issues requiring the Metro shim workaround
- NativeWind v4.2 + Reanimated v4 compatibility should be verified during project scaffolding

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions
- When in doubt about a pattern, check the anti-patterns table first

**First Implementation Priority:**
```bash
npx create-expo-app@latest APIxAnkiOnMobile --template blank-typescript
```
Then install dependencies as specified in the Starter Template section.

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow:** COMPLETED
**Total Steps Completed:** 8
**Date Completed:** 2026-02-01
**Document Location:** `_bmad-output/planning-artifacts/architecture.md`

### Final Architecture Deliverables

- 14 architectural decisions made (5 critical, 4 important, 5 deferred)
- 12 implementation patterns defined across 5 categories
- ~12 architectural components specified
- 38 functional + 18 non-functional requirements fully supported
- Complete project directory structure with FR-to-file mapping
- Validation confirming coherence, coverage, and readiness

### Architecture Status: READY FOR IMPLEMENTATION

**Next Phase:** Create Epics and Stories (PM agent), then Implementation Readiness Review (Architect agent).

**Document Maintenance:** Update this architecture when major technical decisions change during implementation.
