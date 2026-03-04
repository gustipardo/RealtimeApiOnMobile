# Source Tree Analysis - RealtimeAPIxAnki Web Prototype

Generated: 2026-01-15 | Scan Level: Deep

## Project Structure

```
RealtimeAPIxAnki/
├── src/                              # Source code root
│   ├── main.tsx                      # Application entry point
│   ├── App.tsx                       # Root component (Orchestrator)
│   ├── index.css                     # Global styles (Tailwind imports)
│   │
│   ├── components/                   # UI Components
│   │   ├── AnkiDeckSelector.tsx      # Deck browsing and selection
│   │   ├── AnkiStudySession.tsx      # Manual flashcard study mode
│   │   └── ui/                       # Reusable UI primitives
│   │       ├── ConnectionCard.tsx    # AI connection controls
│   │       ├── DebugPanel.tsx        # Debug console (floating)
│   │       ├── LiveCardDisplay.tsx   # Card display during AI session
│   │       └── StatusBadge.tsx       # Evaluation feedback badge
│   │
│   ├── hooks/                        # Custom React Hooks (State Management)
│   │   ├── useRealtimeSession.ts     # Core: AI session + WebRTC + tools
│   │   └── useAudioDevices.ts        # Hardware: Microphone detection
│   │
│   ├── services/                     # External API Integration
│   │   ├── AnkiConnectService.ts     # Real Anki integration (localhost:8765)
│   │   └── AnkiService.ts            # Mock service for testing
│   │
│   ├── data/                         # Static Data
│   │   └── mock_deck.ts              # Mock flashcard data (AWS Security)
│   │
│   └── utils/                        # Utility Functions
│       └── textUtils.ts              # HTML cleaning for TTS
│
├── public/                           # Static assets (served as-is)
├── index.html                        # HTML entry point
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration (composite)
├── tsconfig.app.json                 # App TypeScript config
├── tsconfig.node.json                # Node TypeScript config
├── vite.config.ts                    # Vite build configuration
├── eslint.config.js                  # ESLint configuration
└── .gitignore                        # Git ignore rules
```

## Critical Directories

### `/src/hooks/` - State Management Layer
**Purpose:** Contains custom React hooks that manage application state.

| File | Lines | Responsibility |
|------|-------|----------------|
| `useRealtimeSession.ts` | ~446 | Core AI session management, WebRTC connection, tool handling |
| `useAudioDevices.ts` | ~40 | Microphone detection and device change monitoring |

**Key Pattern:** All complex state logic is isolated in hooks, keeping components thin.

### `/src/services/` - Integration Layer
**Purpose:** External API communication with Anki.

| File | Lines | Responsibility |
|------|-------|----------------|
| `AnkiConnectService.ts` | ~75 | Real Anki integration via localhost HTTP API |
| `AnkiService.ts` | ~43 | Mock service using static data |

**Key Pattern:** Service classes with async methods, error handling via try/catch.

### `/src/components/` - UI Layer
**Purpose:** React components for user interface.

| File | Lines | Responsibility |
|------|-------|----------------|
| `AnkiDeckSelector.tsx` | ~253 | Deck browsing, card preview, pagination |
| `AnkiStudySession.tsx` | ~206 | Manual study flow with answer grading |
| `ui/ConnectionCard.tsx` | ~130 | AI connection button and status |
| `ui/DebugPanel.tsx` | ~40 | Floating debug log display |
| `ui/LiveCardDisplay.tsx` | ~50 | Current card during AI session |
| `ui/StatusBadge.tsx` | ~30 | Correct/Incorrect evaluation badge |

## Entry Points

1. **Application Entry:** `src/main.tsx`
   - Creates React root
   - Renders `<App />` in StrictMode

2. **Component Entry:** `src/App.tsx`
   - Orchestrates all state hooks
   - Routes between Manual Study and AI Study modes

## Integration Points

### OpenAI Realtime API
- **Location:** `src/hooks/useRealtimeSession.ts`
- **Protocol:** WebRTC (via `OpenAIRealtimeWebRTC`)
- **Authentication:** API key from `VITE_OPENAI_API_KEY` env var
- **Tool Function:** `evaluate_and_move_next` for atomic turn handling

### AnkiConnect API
- **Location:** `src/services/AnkiConnectService.ts`
- **Endpoint:** `http://127.0.0.1:8765`
- **Protocol:** HTTP POST with JSON-RPC style
- **Version:** AnkiConnect API v6

## Data Flow

```
User Voice Input
       │
       ▼
[Browser Microphone] ──► [MediaStream]
       │
       ▼
[OpenAI Realtime WebRTC] ◄──────────────────┐
       │                                      │
       ▼                                      │
[AI Tool Call: evaluate_and_move_next]        │
       │                                      │
       ▼                                      │
[useRealtimeSession Hook]                     │
       │                                      │
       ├──► [AnkiConnectService] ──► [Anki Desktop]
       │           │
       │           ▼
       │    [Card Data]
       │           │
       ▼           ▼
[React State Update] ──► [UI Components]
       │
       ▼
[AI Response + Next Question] ────────────────┘
```
