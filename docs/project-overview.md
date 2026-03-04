# Project Overview - RealtimeAPIxAnki

## Summary

**RealtimeAPIxAnki** is a voice-powered Anki flashcard study web application that uses the OpenAI Realtime API to enable natural language conversation with an AI tutor during flashcard review sessions.

## Purpose

This is the **web prototype** for validating the concept before migrating to a native mobile application using Expo React Native.

## Key Features

1. **Voice-Powered Study Sessions**
   - Real-time voice conversation with AI tutor
   - Semantic answer evaluation (order-independent, synonym-tolerant)
   - No hints policy - one attempt per card

2. **Anki Integration**
   - Connect to local Anki Desktop via AnkiConnect
   - Browse decks, filter due cards
   - Submit answers to update Anki scheduling

3. **Manual Study Mode**
   - Traditional flashcard flip interface
   - Self-grading (Correct/Incorrect)
   - Works as fallback when AI not available

4. **Mock Mode**
   - Built-in AWS Security flashcard deck
   - Works without Anki Desktop running
   - Useful for development and demos

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | TailwindCSS 4 |
| AI | OpenAI Realtime API via @openai/agents SDK |
| Anki | AnkiConnect HTTP API (localhost:8765) |

## Architecture

```
React SPA
    │
    ├── Custom Hooks (State)
    │   ├── useRealtimeSession (AI + WebRTC)
    │   └── useAudioDevices (Hardware)
    │
    ├── Components (UI)
    │   ├── AnkiDeckSelector
    │   ├── AnkiStudySession
    │   └── UI Primitives
    │
    └── Services (Integration)
        ├── AnkiConnectService (Real Anki)
        └── AnkiService (Mock Data)
```

## Repository Structure

- **RealtimeAPIxAnki/** - This web prototype (source)
- **RealtimeApiOnMobile/** - Mobile port target (empty, to be built)

## Known Limitations

1. **Localhost Only:** AnkiConnect requires Anki Desktop on same machine
2. **Browser Audio:** WebRTC audio handling varies by browser
3. **API Key Exposure:** Using insecure API key mode (prototype only)
4. **No Offline:** Requires internet for AI, local network for Anki

## Technical Debt

Four critical issues identified for mobile architecture to solve:

1. UI/Voice async race conditions
2. Incomplete feedback loop on incorrect answers
3. Zombie sessions (audio not cleaning up)
4. Excessive AI hinting

See [Architecture Documentation](./architecture.md) for details.

## Getting Started

See [Development Guide](./development-guide.md) for setup instructions.
