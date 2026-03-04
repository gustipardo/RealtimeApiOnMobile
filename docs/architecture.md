# Architecture Documentation - RealtimeAPIxAnki Web Prototype

Generated: 2026-01-15 | For: Mobile Migration Reference

## Executive Summary

RealtimeAPIxAnki is a voice-powered Anki flashcard study application built with React 19 and the OpenAI Realtime API. It enables users to study Anki decks through voice conversation with an AI tutor that evaluates answers semantically.

**Purpose of This Document:** Reference for migrating to Expo React Native mobile app.

## Architecture Pattern

**Pattern:** React SPA with Custom Hooks + Service Layer

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (Components)                 │
│  AnkiDeckSelector │ AnkiStudySession │ UI Primitives    │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                 State Layer (Custom Hooks)               │
│       useRealtimeSession │ useAudioDevices              │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                Integration Layer (Services)              │
│     AnkiConnectService │ AnkiService │ OpenAI SDK       │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│                  External Systems                        │
│     Anki Desktop (localhost:8765) │ OpenAI API          │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

| Category | Technology | Version | Migration Notes |
|----------|------------|---------|-----------------|
| Framework | React | 19.2.0 | React Native uses same concepts |
| Language | TypeScript | 5.9.3 | Fully portable |
| Build | Vite | 7.2.4 | Replace with Expo/Metro |
| Styling | TailwindCSS | 4.1.17 | Use NativeWind or StyleSheet |
| AI | @openai/agents | 0.3.4 | Check React Native compatibility |
| Icons | lucide-react | 0.555.0 | Use lucide-react-native |

## Core Components

### 1. State Management: useRealtimeSession Hook

**Location:** `src/hooks/useRealtimeSession.ts` (446 lines)

**Responsibilities:**
- WebRTC connection to OpenAI Realtime API
- Microphone stream management
- AI tool function execution
- Card state synchronization
- Session lifecycle (connect/disconnect/study)

**State Variables:**
```typescript
interface RealtimeSessionState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  debugInfo: string;
  evaluation: 'correct' | 'incorrect' | null;
  isStudyMode: boolean;
  currentCard: any | null;
}
```

**Key Methods:**
- `connect(skipGreeting?)` - Establish WebRTC session
- `disconnect()` - Clean up session and streams
- `startStudySession(deckName?)` - Begin study with AI tutor

**Migration Consideration:** Core hook can be adapted but needs:
- Replace `navigator.mediaDevices` with `expo-av`
- Handle mobile audio focus/interruptions
- Implement background audio handling

### 2. Anki Integration: AnkiConnectService

**Location:** `src/services/AnkiConnectService.ts` (75 lines)

**API Endpoint:** `http://127.0.0.1:8765`

**Methods:**
| Method | AnkiConnect Action | Purpose |
|--------|-------------------|---------|
| `deckNames()` | `deckNames` | List all decks |
| `findCards(deck)` | `findCards` | Get all card IDs in deck |
| `findDueCards(deck)` | `findCards` (with filter) | Get due card IDs |
| `cardsInfo(ids)` | `cardsInfo` | Get card details |
| `answerCard(id, ease)` | `answerCards` | Submit review answer |

**Migration Challenge:** `localhost` doesn't work on mobile.

**Proposed Solutions:**
1. **Local Network IP:** Connect to PC running Anki via `192.168.x.x:8765`
2. **Export/Import:** Export deck to JSON, load into mobile app
3. **Hybrid:** Use local IP when on same network, offline mode otherwise

### 3. AI Tool Function: evaluate_and_move_next

**Purpose:** Atomic turn handling - grade answer AND fetch next card in one call.

**Parameters:**
```typescript
{
  user_response_quality: "correct" | "incorrect",
  feedback_text: string
}
```

**Returns:**
```typescript
{
  status: "success",
  answered_card_back: string,  // Correct answer for feedback
  next_card: {
    front: string,
    back: string
  }
}
```

**System Prompt Rules:**
- Semantic evaluation (order-independent, synonym-tolerant)
- No hints allowed
- Must reveal correct answer on incorrect before next question
- One attempt per card

## Known Technical Debt / Bugs

These issues must be solved by design in the mobile architecture:

### 1. UI/Voice Async Race Conditions
**Symptom:** AI starts reading next card while UI shows previous card.
**Root Cause:** No synchronization between voice output completion and UI state update.
**Fix Required:** Implement state machine with explicit `FEEDBACK_VOICE_COMPLETE` state.

### 2. Incomplete Feedback Loop
**Symptom:** On incorrect answer, AI sometimes skips revealing the correct answer.
**Root Cause:** AI instruction following not guaranteed; tool result handling inconsistent.
**Fix Required:** Force answer reveal in tool response, not AI discretion.

### 3. Zombie Sessions
**Symptom:** "End Session" doesn't always kill audio connection.
**Root Cause:** Missing cleanup in disconnect flow, race conditions with WebRTC.
**Fix Required:** Explicit stream.getTracks().forEach(t => t.stop()) + connection close.

### 4. Excessive Hinting
**Symptom:** AI gives hints too early or too explicitly.
**Root Cause:** System prompt not strictly enforced.
**Fix Required:** Gate hint logic in code, not just prompt instructions.

## Data Models

### Card Structure (AnkiConnect)

```typescript
interface AnkiCard {
  cardId: number;
  fields: {
    Front: { value: string };
    Back: { value: string };
    // Additional fields depending on note type
  };
  // Additional metadata: queue, type, due, interval, etc.
}
```

### Mock Card Structure

```typescript
interface Card {
  id: string;
  front: string;
  back: string;
  status: 'new' | 'learning' | 'review' | 'done';
}
```

## Component Inventory

| Component | Purpose | Reusable? |
|-----------|---------|-----------|
| `App.tsx` | Root orchestrator | Partial (restructure for RN navigation) |
| `AnkiDeckSelector` | Deck browsing | Yes (UI needs RN adaptation) |
| `AnkiStudySession` | Manual study mode | Yes (UI needs RN adaptation) |
| `ConnectionCard` | AI connection UI | Yes |
| `DebugPanel` | Debug logs | Yes (useful for mobile debugging) |
| `LiveCardDisplay` | Current card display | Yes |
| `StatusBadge` | Evaluation feedback | Yes |

## Security Considerations

1. **API Key Exposure:** Currently uses `useInsecureApiKey: true` - acceptable for prototype, needs secure handling in production mobile app.

2. **CORS:** Web version requires CORS whitelist in AnkiConnect. Mobile won't have this issue if using native HTTP.

3. **Local Network:** Exposing Anki on local network requires user awareness of security implications.
