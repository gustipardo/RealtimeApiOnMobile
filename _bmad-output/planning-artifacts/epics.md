---
stepsCompleted: [1, 2, 3, 4]
status: 'complete'
completedAt: '2026-02-01'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd.md'
  - '_bmad-output/planning-artifacts/architecture.md'
---

# APIxAnkiOnMobile - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for APIxAnkiOnMobile, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User can start a study session via voice command
FR2: User can end a study session via voice command
FR3: User can hear the current card's question read aloud by the AI tutor
FR4: User can answer card questions by speaking aloud
FR5: System can evaluate spoken answers semantically (synonym-tolerant, order-independent)
FR6: User can hear whether their answer was evaluated as correct or incorrect
FR7: User can hear the correct answer revealed after an incorrect evaluation
FR8: System can automatically advance to the next card after evaluation and feedback
FR9: User can request the current question be repeated via voice command ("repeat")
FR10: User can skip the current card via voice command ("skip")
FR11: User can override an AI evaluation via voice command ("actually, mark that correct")
FR12: User can hear a session completion summary (cards reviewed, correct/incorrect counts)
FR13: System can read deck structure from AnkiDroid via ContentProvider API
FR14: System can read card content (front/back fields) from AnkiDroid
FR15: System can read due card queue from AnkiDroid
FR16: System can trigger AnkiDroid to sync with AnkiWeb after session completion
FR17: User can select which deck to study
FR18: User can continue a study session with the screen off
FR19: System can display a persistent notification during active session with progress info
FR20: User can pause/resume a session from the notification controls
FR21: User can end a session from the notification controls
FR22: System can handle audio focus interruptions (incoming calls, other apps) and resume gracefully
FR23: System can detect network connectivity loss during a session
FR24: System can notify the user of connection loss via audio
FR25: System can preserve session progress during network interruption
FR26: System can automatically reconnect and resume the session when connectivity is restored
FR27: User can confirm resumption after reconnection
FR28: System can detect whether AnkiDroid is installed on the device
FR29: System can prompt the user to install AnkiDroid if not present
FR30: System can request AnkiDroid ContentProvider permission from the user
FR31: System can explain why the permission is needed before requesting
FR32: User can complete onboarding setup without typing (voice or tap only)
FR33: System can display available decks after successful permission grant
FR34: System can detect when AnkiDroid has no decks available and inform the user
FR35: System can detect when no cards are due in the selected deck and inform the user
FR36: System can fall back gracefully if AnkiDroid ContentProvider is unavailable
FR37: System can detect microphone permission denial and guide the user to grant it
FR38: User can see the current card question and evaluation result on screen as an optional visual companion to the audio session

### NonFunctional Requirements

NFR1: AI voice response latency must be <2 seconds (P95) from end of user speech to start of AI speech
NFR2: AnkiDroid card data retrieval must complete within 1 second for deck loading
NFR3: Session startup (from voice command to first card read) must complete within 5 seconds
NFR4: Network reconnection must be attempted within 3 seconds of connectivity restoration
NFR5: OpenAI API key must be stored securely (not in plaintext, not in source code, not exposed to other apps)
NFR6: No user credentials are stored by the application
NFR7: Card data read from AnkiDroid must be cached in memory only for session duration, not persisted to disk
NFR8: All study session functionality must be fully operable without visual interaction (eyes-free)
NFR9: All study session functionality must be fully operable without touch interaction (hands-free)
NFR10: Audio output must be clear and at user-controllable volume via system controls
NFR11: Visual companion display must use sufficient contrast and font size for quick glance readability
NFR12: Application must function with AnkiDroid API v1.1.0 and handle API unavailability gracefully
NFR13: Application must handle OpenAI Realtime API connection drops without data loss
NFR14: AnkiDroid ContentProvider interactions must not interfere with AnkiDroid's own operation or sync schedule
NFR15: Crash-free session rate must be 99%+
NFR16: Session progress must survive app backgrounding and return to foreground
NFR17: Audio session must continue uninterrupted when screen is locked
NFR18: Application must handle Android lifecycle events without losing session state where possible

### Additional Requirements

**From Architecture:**
- Starter template: `npx create-expo-app@latest APIxAnkiOnMobile --template blank-typescript` with post-init dependency installation (NativeWind, Zustand, react-native-webrtc, expo-secure-store, expo-dev-client)
- Custom Kotlin Expo native module required for AnkiDroid ContentProvider access (read-only: decks, cards, due queue)
- Session state machine (FSM) must govern all session transitions — central coordinator for voice, audio, UI, network
- WebRTC connection via react-native-webrtc (not @openai/agents SDK wrapper) with custom connection manager
- Foreground Service native module for background audio, notification controls, audio focus handling
- Zustand stores organized by domain: useSessionStore, useCardCacheStore, useConnectionStore, useSettingsStore
- Tool function `evaluate_and_move_next` preserved from web prototype, reads from Zustand card cache
- Expo Router file-based routing with 3 screen groups: (onboarding), (main)/deck-select, (main)/session
- NativeWind v4.2+ with TailwindCSS v3.4.17 for styling
- EAS Build for native binaries, local dev builds via `npx expo run:android`
- No backend infrastructure — fully client-side
- No persistent database — in-memory card cache only, AsyncStorage for settings persistence

### FR Coverage Map

FR1: Epic 3 - Voice session start command
FR2: Epic 3 - Voice session end command
FR3: Epic 3 - AI reads card question aloud
FR4: Epic 3 - User speaks answer
FR5: Epic 3 - Semantic answer evaluation
FR6: Epic 3 - Correct/incorrect feedback
FR7: Epic 3 - Correct answer reveal on incorrect
FR8: Epic 3 - Auto-advance to next card
FR9: Epic 3 - Repeat voice command
FR10: Epic 3 - Skip voice command
FR11: Epic 3 - Override evaluation voice command
FR12: Epic 3 - Session completion summary
FR13: Epic 2 - Read deck structure from AnkiDroid
FR14: Epic 2 - Read card content from AnkiDroid
FR15: Epic 2 - Read due card queue from AnkiDroid
FR16: Epic 3 - Trigger AnkiDroid sync after session
FR17: Epic 2 - Deck selection
FR18: Epic 4 - Screen-off study continuation
FR19: Epic 4 - Persistent notification with progress
FR20: Epic 4 - Pause/resume from notification
FR21: Epic 4 - End session from notification
FR22: Epic 4 - Audio focus interruption handling
FR23: Epic 5 - Network loss detection
FR24: Epic 5 - Audio notification of connection loss
FR25: Epic 5 - Session progress preservation
FR26: Epic 5 - Auto-reconnect and resume
FR27: Epic 5 - User confirms resumption
FR28: Epic 2 - AnkiDroid installation detection
FR29: Epic 2 - Prompt to install AnkiDroid
FR30: Epic 2 - Request ContentProvider permission
FR31: Epic 2 - Explain permission need
FR32: Epic 2 - Zero-typing onboarding
FR33: Epic 2 - Display available decks after permission
FR34: Epic 2 - Detect no decks available
FR35: Epic 2 - Detect no due cards
FR36: Epic 2 - Graceful fallback if ContentProvider unavailable
FR37: Epic 2 - Microphone permission guidance
FR38: Epic 3 - Visual companion display

## Epic List

### Epic 1: Project Foundation & Development Environment
Set up the Expo project with all dependencies, native module scaffolding, and development build pipeline so that development can begin on a physical Android device.
**FRs covered:** None directly (architectural foundation)
**NFRs addressed:** NFR5 (secure storage setup), NFR12 (AnkiDroid API dependency pinned)

### Epic 2: Onboarding & Anki Integration
User can install the app, complete onboarding (AnkiDroid detection, permission grants, API key entry), browse their decks, and select a deck to study — establishing the complete data pipeline from AnkiDroid to the app.
**FRs covered:** FR13, FR14, FR15, FR17, FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR37

### Epic 3: Voice Study Session
User can study their Anki cards through voice conversation with an AI tutor — the core product experience. Includes starting/ending sessions, hearing questions, speaking answers, receiving semantic evaluation and feedback, voice commands (repeat, skip, override), session summary, and visual companion display.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR16, FR38

### Epic 4: Background Audio & Session Persistence
User can continue studying with the screen off, control the session from the notification bar, and have the session survive audio interruptions — making the app truly hands-free and eyes-free.
**FRs covered:** FR18, FR19, FR20, FR21, FR22
**NFRs addressed:** NFR8, NFR9, NFR16, NFR17, NFR18

### Epic 5: Network Resilience & Session Recovery
User's study session gracefully handles network drops — detecting loss, preserving progress, auto-reconnecting, and resuming where they left off without losing any work.
**FRs covered:** FR23, FR24, FR25, FR26, FR27
**NFRs addressed:** NFR4, NFR13, NFR15

---

## Epic 1: Project Foundation & Development Environment

Set up the Expo project with all dependencies, native module scaffolding, and development build pipeline so that development can begin on a physical Android device.

### Story 1.1: Initialize Expo Project with Dependencies

As a developer,
I want the Expo project scaffolded with all required dependencies installed and configured,
So that I have a working development environment on a physical Android device.

**Acceptance Criteria:**

**Given** a fresh project directory
**When** the Expo project is initialized with `npx create-expo-app@latest APIxAnkiOnMobile --template blank-typescript`
**Then** the project builds and runs on a connected Android device via `npx expo run:android`
**And** the following dependencies are installed and configured: NativeWind v4.2+ with TailwindCSS v3.4.17, Zustand v5.0.10, react-native-webrtc with @config-plugins/react-native-webrtc, expo-secure-store, expo-dev-client
**And** `metro.config.js` includes the event-target-shim resolution workaround for react-native-webrtc
**And** `app.json` includes the react-native-webrtc config plugin and required Android permissions (RECORD_AUDIO, INTERNET, FOREGROUND_SERVICE, WAKE_LOCK)
**And** NativeWind renders TailwindCSS classes correctly in a test component
**And** Expo Router file-based routing is set up with placeholder screens for (onboarding)/index and (main)/deck-select and (main)/session

### Story 1.2: Scaffold Zustand Stores and TypeScript Types

As a developer,
I want the core Zustand stores and TypeScript type definitions created with their interfaces,
So that all subsequent epics have a consistent state management foundation.

**Acceptance Criteria:**

**Given** the initialized Expo project from Story 1.1
**When** the stores and types are created
**Then** `src/stores/useSessionStore.ts` exists with SessionPhase type (all states defined: idle, loading_cards, connecting, ready, asking_question, awaiting_answer, evaluating, giving_feedback, advancing, session_complete, paused, reconnecting, error) and transitionTo, recordAnswer, advanceCard, resetSession actions
**And** `src/stores/useCardCacheStore.ts` exists with setCards, getNextCard, getCurrentCard, clear actions
**And** `src/stores/useConnectionStore.ts` exists with WebRTC connection state tracking
**And** `src/stores/useSettingsStore.ts` exists with persist middleware (AsyncStorage) for selectedDeck, onboardingCompleted, apiKeyStored flag
**And** `src/types/anki.ts` defines AnkiCard, DeckInfo, BridgeError interfaces
**And** `src/types/session.ts` defines SessionPhase, SessionTransition, SessionStats types
**And** `src/types/ai.ts` defines EvaluateAndMoveNextResult and tool function types
**And** unit tests pass for useSessionStore (phase transitions) and useCardCacheStore (card queue operations)

### Story 1.3: Create AnkiDroid Native Module Skeleton

As a developer,
I want the Kotlin native module scaffold for AnkiDroid ContentProvider access,
So that the native bridge architecture is established for Epic 2 to implement.

**Acceptance Criteria:**

**Given** the Expo project with dev client from Story 1.1
**When** the native module is scaffolded
**Then** `modules/anki-droid/` directory exists with Expo module structure (expo-module.config.json, index.ts, android/src/main/java/expo/modules/ankidroid/AnkiDroidModule.kt)
**And** `AnkiDroidModule.kt` has stub methods: `isInstalled(): Promise<Boolean>`, `getDeckNames(): Promise<List<String>>`, `getDueCards(deckName: String): Promise<List<ReadableMap>>`, `triggerSync(): Promise<Unit>`
**And** `src/native/ankiBridge.ts` provides typed JS wrappers for all native methods
**And** the module registers correctly and the app builds with the native module included
**And** calling `ankiBridge.isInstalled()` returns a boolean without crashing

---

## Epic 2: Onboarding & Anki Integration

User can install the app, complete onboarding (AnkiDroid detection, permission grants, API key entry), browse their decks, and select a deck to study.

### Story 2.1: AnkiDroid Detection and Installation Prompt

As a new user,
I want the app to detect if AnkiDroid is installed and guide me to install it if not,
So that I can set up the required dependency without confusion.

**Acceptance Criteria:**

**Given** the user opens the app for the first time
**When** the onboarding screen loads
**Then** the system checks for AnkiDroid installation via `ankiBridge.isInstalled()` (FR28)
**And** if AnkiDroid is installed, the user proceeds to the permission step
**And** if AnkiDroid is not installed, the app displays a message explaining the requirement and a button linking to the Play Store (FR29)
**And** the AnkiDroid detection uses Android PackageManager to check for `com.ichi2.anki`
**And** the onboarding flow is completable without typing (FR32)

### Story 2.2: Permission Grants (AnkiDroid + Microphone)

As a new user,
I want to grant the necessary permissions with clear explanations,
So that the app can access my Anki cards and my microphone.

**Acceptance Criteria:**

**Given** AnkiDroid is detected as installed
**When** the permissions screen is displayed
**Then** the app explains why AnkiDroid ContentProvider permission is needed before requesting it (FR31)
**And** the system requests `com.ichi2.anki.permission.READ_WRITE_DATABASE` permission (FR30)
**And** the system requests `RECORD_AUDIO` permission with explanation
**And** if AnkiDroid permission is denied, the app shows guidance on how to grant it manually (FR36)
**And** if microphone permission is denied, the app explains it's required for voice study and shows settings guidance (FR37)
**And** the user can complete this step via tap only (FR32)

### Story 2.3: OpenAI API Key Entry and Secure Storage

As a new user,
I want to enter my OpenAI API key securely,
So that the app can connect to the AI voice service.

**Acceptance Criteria:**

**Given** permissions are granted
**When** the API key entry screen is displayed
**Then** the user can enter their OpenAI API key
**And** the key is stored via expo-secure-store (NFR5)
**And** the key is never displayed in plaintext after entry
**And** `useSettingsStore.apiKeyStored` flag is set to true
**And** the user can re-enter the key later if needed from settings
**And** onboarding is marked complete in useSettingsStore after successful key storage

### Story 2.4: Deck Listing and Selection

As a user,
I want to see my AnkiDroid decks and select one to study,
So that I can choose which subject to review.

**Acceptance Criteria:**

**Given** onboarding is complete and permissions are granted
**When** the deck selection screen loads
**Then** the system reads deck structure from AnkiDroid via ContentProvider (FR13) and displays available decks (FR33)
**And** each deck shows its name and the count of due cards (FR15)
**And** if no decks are available, the system informs the user (FR34)
**And** if the selected deck has no due cards, the system informs the user (FR35)
**And** selecting a deck stores it in useSettingsStore and navigates to the session screen
**And** deck data retrieval completes within 1 second (NFR2)

### Story 2.5: Implement AnkiDroid Native Bridge (ContentProvider Queries)

As a developer,
I want the AnkiDroid native module to actually query the ContentProvider,
So that deck and card data flows from AnkiDroid into the app.

**Acceptance Criteria:**

**Given** the native module skeleton from Epic 1
**When** the ContentProvider queries are implemented in AnkiDroidModule.kt
**Then** `getDeckNames()` queries `content://com.ichi2.anki.flashcards/decks` and returns deck names
**And** `getDueCards(deckName)` queries due cards and returns AnkiCard objects with cardId, front, back, deckName fields
**And** card content has HTML stripped via `cleanAnkiText` (ported to `src/utils/textUtils.ts`)
**And** `triggerSync()` sends the `com.ichi2.anki.DO_SYNC` broadcast intent (FR16)
**And** all native bridge errors are caught and returned as typed BridgeError with codes: ANKIDROID_NOT_INSTALLED, PERMISSION_DENIED, NO_DECKS, QUERY_FAILED
**And** ContentProvider interactions do not interfere with AnkiDroid's own operation (NFR14)
**And** the Android manifest includes the `<queries>` block for `com.ichi2.anki` (required for Android 11+)

---

## Epic 3: Voice Study Session

User can study their Anki cards through voice conversation with an AI tutor — the core product experience.

### Story 3.1: WebRTC Connection to OpenAI Realtime API

As a user,
I want to connect to the AI voice tutor,
So that I can have a voice conversation for studying.

**Acceptance Criteria:**

**Given** a deck is selected and due cards are available
**When** the session screen loads and the user initiates a connection
**Then** `services/webrtcManager.ts` creates an RTCPeerConnection using react-native-webrtc
**And** an SDP offer is sent to OpenAI's `/v1/realtime` endpoint with the API key from expo-secure-store
**And** microphone audio is captured via `mediaDevices.getUserMedia({ audio: true })`
**And** the remote audio track (AI voice) plays through the device speaker
**And** `useConnectionStore` tracks connection state (disconnected, connecting, connected, failed)
**And** connection failure shows an error in the UI and transitions session FSM to `error`

### Story 3.2: Session State Machine and Card Loading

As a user,
I want the study session to initialize by loading my due cards and preparing the AI tutor,
So that the session starts quickly and reliably.

**Acceptance Criteria:**

**Given** WebRTC connection is established
**When** the user starts a study session (FR1)
**Then** `services/cardLoader.ts` loads all due cards from AnkiDroid via `ankiBridge.getDueCards()` into `useCardCacheStore`
**And** card loading and WebRTC connection happen in parallel for <5s startup (NFR3)
**And** `services/sessionStateMachine.ts` transitions from `idle` → `loading_cards` → `connecting` → `ready` → `asking_question`
**And** the AI system prompt is configured with the `evaluate_and_move_next` tool function definition (from `config/prompts.ts`)
**And** the AI begins reading the first card's question aloud (FR3)
**And** card data is cached in memory only (NFR7)

### Story 3.3: Core Study Loop (Answer, Evaluate, Feedback, Advance)

As a user,
I want to answer questions by speaking and receive evaluation and feedback,
So that I can study through natural voice conversation.

**Acceptance Criteria:**

**Given** the AI has read a card question aloud
**When** the user speaks their answer (FR4)
**Then** the AI evaluates the answer semantically — synonym-tolerant and order-independent (FR5)
**And** the AI tells the user if they were correct or incorrect (FR6)
**And** on incorrect, the AI reveals the correct answer before moving on (FR7)
**And** the `evaluate_and_move_next` tool function is called, which reads the next card from `useCardCacheStore` and returns it to the AI
**And** the system automatically advances to the next card (FR8)
**And** the session FSM transitions: `awaiting_answer` → `evaluating` → `giving_feedback` → `advancing` → `asking_question`
**And** `useSessionStore.stats` is updated with correct/incorrect count
**And** AI voice response latency is <2 seconds P95 (NFR1)

### Story 3.4: Voice Commands (Repeat, Skip, Override, End)

As a user,
I want voice commands to control the session,
So that I can study completely hands-free.

**Acceptance Criteria:**

**Given** an active study session
**When** the user says "repeat" (FR9)
**Then** the AI re-reads the current card question

**Given** an active study session
**When** the user says "skip" (FR10)
**Then** the current card is skipped and the next card is presented

**Given** the AI has just evaluated an answer
**When** the user says "actually, mark that correct" or similar override phrase (FR11)
**Then** the previous evaluation is corrected in session stats and the AI acknowledges the override

**Given** an active study session
**When** the user says "end session" or similar (FR2)
**Then** the session ends and a completion summary is spoken (FR12) including cards reviewed, correct count, incorrect count
**And** AnkiDroid sync is triggered via `ankiBridge.triggerSync()` (FR16)
**And** session FSM transitions to `session_complete`

### Story 3.5: Session Completion and Summary

As a user,
I want to hear a summary when all cards are reviewed,
So that I know my progress and feel closure.

**Acceptance Criteria:**

**Given** an active study session
**When** the last due card has been reviewed (no more cards in cache)
**Then** the `evaluate_and_move_next` tool returns `status: 'session_complete'`
**And** the AI speaks a completion summary: total cards reviewed, correct, incorrect (FR12)
**And** session FSM transitions to `session_complete`
**And** AnkiDroid sync is triggered (FR16)
**And** the UI shows a session summary screen with the stats
**And** the user can return to deck selection

### Story 3.6: Visual Companion Display

As a user,
I want to optionally see the current card on screen,
So that I can glance at the question if needed while primarily listening.

**Acceptance Criteria:**

**Given** an active study session
**When** a card question is being asked
**Then** the `CardDisplay` component shows the current card front text (FR38)
**And** after evaluation, the component shows the evaluation result (correct/incorrect badge)
**And** the display uses sufficient contrast and font size for quick glance readability (NFR11)
**And** the visual companion updates are driven by `useSessionStore` subscriptions, not independent state

---

## Epic 4: Background Audio & Session Persistence

User can continue studying with the screen off, control the session from the notification bar, and have the session survive audio interruptions.

### Story 4.1: Android Foreground Service for Background Audio

As a user,
I want my study session to continue when I turn off the screen,
So that I can study truly hands-free while walking, driving, or working.

**Acceptance Criteria:**

**Given** an active study session
**When** the user locks the screen or switches to another app
**Then** a Foreground Service keeps the WebRTC audio session alive (FR18)
**And** the AI voice continues playing through the speaker/earbuds
**And** the microphone remains active for voice input
**And** the Foreground Service creates a required notification channel for Android 8.0+ (API 26)
**And** session progress survives app backgrounding and return to foreground (NFR16)
**And** audio continues uninterrupted when screen is locked (NFR17)

### Story 4.2: Notification Controls (Pause, Resume, End)

As a user,
I want to control my session from the notification bar,
So that I can pause or stop without unlocking my phone.

**Acceptance Criteria:**

**Given** an active study session with Foreground Service running
**When** the persistent notification is displayed
**Then** the notification shows current progress (card X of Y) (FR19)
**And** the notification has a Pause/Resume action button (FR20)
**And** the notification has an End Session action button (FR21)
**And** tapping Pause pauses the WebRTC session (mutes mic, pauses AI) and transitions FSM to `paused`
**And** tapping Resume resumes the session from where it was paused
**And** tapping End Session triggers session completion flow (summary + sync)
**And** notification updates in real-time as cards progress

### Story 4.3: Audio Focus Management

As a user,
I want my session to handle phone calls and other audio interruptions gracefully,
So that I don't lose my study progress when interrupted.

**Acceptance Criteria:**

**Given** an active study session
**When** an audio focus interruption occurs (incoming call, navigation app, music app) (FR22)
**Then** the session automatically pauses (FSM → `paused`)
**And** when audio focus is regained, the session resumes from where it was paused
**And** if audio focus is permanently lost (e.g., user starts music), the session remains paused until user explicitly resumes
**And** audio focus is requested with `AUDIOFOCUS_GAIN` at session start
**And** Android lifecycle events (low memory, process kill) are handled without losing session state where possible (NFR18)

---

## Epic 5: Network Resilience & Session Recovery

User's study session gracefully handles network drops — detecting loss, preserving progress, auto-reconnecting, and resuming.

### Story 5.1: Network Loss Detection and User Notification

As a user,
I want to be notified when my connection drops during a study session,
So that I know what's happening and don't think the app is broken.

**Acceptance Criteria:**

**Given** an active study session
**When** network connectivity is lost (FR23)
**Then** the system detects the loss within 3 seconds
**And** the session FSM transitions to `reconnecting`
**And** the user is notified via audio: "Connection lost. Your progress is saved. I'll resume when you're back online." (FR24)
**And** session progress (current card index, stats) is preserved in useSessionStore (FR25)
**And** the notification updates to show "Reconnecting..."

### Story 5.2: Auto-Reconnect and Session Resume

As a user,
I want my session to automatically resume after a network drop,
So that I can continue studying without manual intervention.

**Acceptance Criteria:**

**Given** the session is in `reconnecting` state
**When** network connectivity is restored
**Then** reconnection is attempted within 3 seconds (NFR4)
**And** the WebRTC connection is re-established via `webrtcManager` retry logic (exponential backoff, max 3 attempts)
**And** on successful reconnection, the user hears: "We're back. Ready to continue where you left off?" (FR27)
**And** the user confirms and the session resumes from the next unreviewed card (FR26)
**And** session FSM transitions: `reconnecting` → `ready` → `asking_question`
**And** no review data is lost during the interruption (NFR13)
**And** if all reconnection attempts fail, FSM transitions to `error` and the user is notified with option to retry or end session
**And** crash-free session rate target is 99%+ across reconnection scenarios (NFR15)
