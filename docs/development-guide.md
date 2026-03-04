# Development Guide - RealtimeAPIxAnki

## Prerequisites

- **Node.js:** v18+ (LTS recommended)
- **Package Manager:** npm (comes with Node.js)
- **Anki Desktop:** With AnkiConnect add-on installed
- **OpenAI API Key:** With Realtime API access

## Environment Setup

### 1. Clone and Install

```bash
cd RealtimeAPIxAnki
npm install
```

### 2. Environment Variables

Create a `.env` file in the project root:

```env
VITE_OPENAI_API_KEY=sk-your-openai-api-key
```

### 3. AnkiConnect Setup

1. Open Anki Desktop
2. Install AnkiConnect add-on (code: `2055492159`)
3. Go to Tools > Add-ons > AnkiConnect > Config
4. Add your dev server origin to CORS whitelist:

```json
{
  "webCorsOriginList": [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]
}
```

5. Restart Anki

## Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (Vite HMR) |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint checks |

## Running Locally

```bash
# Start dev server
npm run dev

# Open in browser
# http://localhost:5173
```

**Important:** Anki Desktop must be running with AnkiConnect for real card functionality.

## Build Process

```bash
# TypeScript compile + Vite build
npm run build

# Output directory: dist/
```

## Technology Stack Reference

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI Framework |
| TypeScript | 5.9.3 | Type Safety |
| Vite | 7.2.4 | Build Tool & Dev Server |
| TailwindCSS | 4.1.17 | Styling |
| @openai/agents | 0.3.4 | Realtime AI Integration |

## Code Conventions

### File Organization
- Components in `src/components/`
- Hooks in `src/hooks/`
- Services in `src/services/`
- Utilities in `src/utils/`

### Naming Conventions
- Components: PascalCase (`AnkiDeckSelector.tsx`)
- Hooks: camelCase with `use` prefix (`useRealtimeSession.ts`)
- Services: PascalCase with `Service` suffix (`AnkiConnectService.ts`)

### State Management
- Use custom hooks for complex state
- Keep components thin (orchestration only)
- Services are stateless API wrappers

## Debugging

### Debug Panel
The app includes a floating debug panel that shows:
- Connection status events
- AI transcripts
- User transcripts
- Tool call execution logs

Toggle via the DebugPanel component in the UI.

### Common Issues

| Issue | Solution |
|-------|----------|
| "CORS error" when connecting to Anki | Add localhost to AnkiConnect CORS whitelist |
| "VITE_OPENAI_API_KEY not found" | Create `.env` file with API key |
| Microphone not detected | Check browser permissions |
| AI not responding | Check browser console for WebRTC errors |

## Testing

Currently no automated tests configured. Manual testing workflow:

1. **Mock Mode:** Test without Anki running (uses `AnkiService` with mock data)
2. **Real Mode:** Test with Anki Desktop running and decks loaded
