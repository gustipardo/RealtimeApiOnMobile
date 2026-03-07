# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Autonomy Rules

You have full decision-making authority on this project. When faced with choices:

- NEVER stop to ask unless the decision is irreversible or destructive.
- When multiple options are presented, always pick one and proceed.
  Do not list options for the user to choose from.
- Decision priority order: stability > simplicity > performance > novelty.
- If two options are equivalent, pick the more documented one.
- If you're unsure, bias toward the most mainstream/conventional choice.
- If you made a wrong call, it can be fixed in the next iteration.
  A wrong decision is better than no decision.
- Treat yourself as a senior developer with full context. Act accordingly.

## Project Overview

Android-only Expo (SDK 54) + React Native app that uses **OpenAI's Realtime API via WebRTC** to act as a voice-powered Anki study tutor. The AI reads flashcard questions aloud, listens to spoken answers, evaluates them, and advances through the deck.

## Common Commands

```bash
npm install --legacy-peer-deps   # Install deps (--legacy-peer-deps required)
npm run android                  # Build and run on Android device/emulator
npm start                        # Start Metro bundler only
npm test                         # Run Jest tests
cd android && ./gradlew clean    # Clean Android build artifacts
```

Tests use Jest with `node` environment (not jest-expo). Test files live in `__tests__/` directories adjacent to the code they test. Run a single test with:
```bash
npx jest --testPathPattern="useSessionStore"
```

## Architecture

### Routing (Expo Router, file-based)
- `src/app/index.tsx` — Root redirect based on onboarding state
- `src/app/(onboarding)/` — First-run flow: permissions, API key entry
- `src/app/(main)/` — Main app: deck selection (`deck-select.tsx`), study session (`session.tsx`)

### Service Layer (`src/services/`)
- **`sessionManager.ts`** — Central orchestrator. Manages the full study session lifecycle: connects WebRTC, loads cards, configures AI prompts, handles tool calls from the AI, advances cards, records answers.
- **`webrtcManager.ts`** — Manages WebRTC peer connection to OpenAI Realtime API. Handles SDP negotiation, microphone capture, data channel for server events. Singleton instance.
- **`cardLoader.ts`** — Loads due cards from AnkiDroid via the native bridge, manages card cache access.
- **`foregroundAudioService.ts`** — Android foreground service to keep audio alive when app is backgrounded.

### State Management (Zustand stores in `src/stores/`)
- **`useSessionStore`** — Session phase state machine (`idle → connecting → loading_cards → ready → studying → ...`), card index, stats
- **`useConnectionStore`** — WebRTC connection state, reconnect tracking
- **`useSettingsStore`** — Persisted settings (selected deck, onboarding state, API key flag) via AsyncStorage
- **`useCardCacheStore`** — In-memory card cache with current/next card accessors

### Native Modules (`modules/`)
Two local Expo modules (Android/Kotlin), linked as `file:` dependencies in package.json:
- **`anki-droid`** — Reads decks and due cards from AnkiDroid via Android ContentProvider. Accessed through `src/native/ankiBridge.ts`.
- **`expo-foreground-audio`** — Android foreground service for persistent audio during study sessions.

### Key Data Flow
1. User selects deck → `sessionManager.startSession()` connects WebRTC, loads cards from AnkiDroid
2. AI receives system prompt + tools via data channel (`src/config/prompts.ts`)
3. AI speaks questions, user answers via microphone
4. AI calls `evaluate_and_move_next` tool → sessionManager grades card, fetches next card, returns result
5. Loop continues until all cards reviewed

### Config
- `app.config.js` merges `app.json` with runtime env (`OPENAI_API_KEY` from `.env`)
- API key stored in `expo-secure-store` at runtime; `.env` is for development convenience only
- Styling: NativeWind (TailwindCSS for React Native)
