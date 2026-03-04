# Component Inventory - RealtimeAPIxAnki

## Overview

Total Components: 8
UI Primitives: 4
Feature Components: 2
Root Components: 2

## Component Catalog

### Root Components

#### App.tsx
**Path:** `src/App.tsx`
**Lines:** 100
**Purpose:** Root orchestrator component

**Props:** None (root component)

**State Dependencies:**
- `useAudioDevices()` - Hardware detection
- `useRealtimeSession()` - AI session state
- `useState` - Manual study mode toggle

**Renders:**
- `AnkiDeckSelector` (when not in study mode)
- `AnkiStudySession` (when in manual study mode)
- `StatusBadge`, `LiveCardDisplay`, `ConnectionCard`, `DebugPanel` (always)

---

#### main.tsx
**Path:** `src/main.tsx`
**Lines:** 10
**Purpose:** Application entry point, React root creation

---

### Feature Components

#### AnkiDeckSelector
**Path:** `src/components/AnkiDeckSelector.tsx`
**Lines:** 253
**Purpose:** Deck browsing, card preview, study mode triggers

**Props:**
```typescript
interface AnkiDeckSelectorProps {
  onStartStudy?: (deckName: string) => void;      // Manual study trigger
  onStartConversational?: (deckName: string) => void;  // AI study trigger
}
```

**Internal State:**
- `isConnected` - AnkiConnect connection status
- `isLoading` - Loading indicator
- `error` - Error message
- `decks` - List of deck names
- `selectedDeck` - Currently selected deck
- `allCardIds` - All card IDs in deck
- `cards` - Current page of card details
- `showDueOnly` - Filter toggle
- `currentPage` - Pagination state

**Features:**
- Connect to AnkiConnect
- List decks dropdown
- Due cards filter toggle
- Card preview with pagination (10 per page)
- Start Manual Study button
- Start Conversational Study button

---

#### AnkiStudySession
**Path:** `src/components/AnkiStudySession.tsx`
**Lines:** 206
**Purpose:** Manual flashcard study interface (no AI)

**Props:**
```typescript
interface AnkiStudySessionProps {
  deckName: string;
  initialCards?: number[];
  onExit: () => void;
}
```

**Internal State:**
- `queue` - Remaining card IDs
- `currentCard` - Current card being studied
- `isLoading` - Loading state
- `showBack` - Card flip state
- `error` - Error message
- `sessionStats` - Correct/incorrect counts

**Features:**
- Card front/back display
- Show Answer button
- Correct/Incorrect answer buttons
- Session completion summary
- Auto-fetch more due cards when queue empty

---

### UI Primitive Components

#### ConnectionCard
**Path:** `src/components/ui/ConnectionCard.tsx`
**Lines:** ~130
**Purpose:** AI connection status and controls

**Props:**
```typescript
interface ConnectionCardProps {
  isConnected: boolean;
  isConnecting: boolean;
  isStudyMode: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onStartStudy: () => void;
  hasMicrophone: boolean;
  error: string | null;
}
```

---

#### DebugPanel
**Path:** `src/components/ui/DebugPanel.tsx`
**Lines:** ~40
**Purpose:** Floating debug console for development

**Props:**
```typescript
interface DebugPanelProps {
  logs: string;
  onClear: () => void;
}
```

---

#### LiveCardDisplay
**Path:** `src/components/ui/LiveCardDisplay.tsx`
**Lines:** ~50
**Purpose:** Display current card during AI conversation mode

**Props:**
```typescript
interface LiveCardDisplayProps {
  card: any | null;
  isListening: boolean;
}
```

---

#### StatusBadge
**Path:** `src/components/ui/StatusBadge.tsx`
**Lines:** ~30
**Purpose:** Visual feedback for correct/incorrect evaluation

**Props:**
```typescript
interface StatusBadgeProps {
  status: 'correct' | 'incorrect' | null;
}
```

---

## Hooks

#### useRealtimeSession
**Path:** `src/hooks/useRealtimeSession.ts`
**Lines:** 446
**Purpose:** Core AI session management

**Returns:**
```typescript
{
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  debugInfo: string;
  setDebugInfo: (info: string) => void;
  evaluation: 'correct' | 'incorrect' | null;
  isStudyMode: boolean;
  currentCard: any | null;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  startStudySession: (deckName?: string) => Promise<void>;
}
```

---

#### useAudioDevices
**Path:** `src/hooks/useAudioDevices.ts`
**Lines:** 40
**Purpose:** Microphone availability detection

**Returns:**
```typescript
{
  hasMicrophone: boolean;
}
```

---

## Services

#### AnkiConnectService
**Path:** `src/services/AnkiConnectService.ts`
**Lines:** 75
**Type:** Class (stateless)

**Methods:**
- `deckNames(): Promise<string[]>`
- `findCards(deckName): Promise<number[]>`
- `findDueCards(deckName): Promise<number[]>`
- `cardsInfo(cardIds): Promise<any[]>`
- `answerCard(cardId, ease): Promise<boolean>`

---

#### AnkiService
**Path:** `src/services/AnkiService.ts`
**Lines:** 43
**Type:** Class (stateful - holds deck position)

**Methods:**
- `startSession(): void`
- `getNextCard(): { card: Card | null; progress: string }`
- `getDeckStats(): { totalCards, name, remainingCards }`
- `reset(): void`

---

## Utilities

#### textUtils.ts
**Path:** `src/utils/textUtils.ts`
**Lines:** 49

**Functions:**
- `cleanAnkiText(rawHtml): string` - Removes HTML tags, media refs, normalizes whitespace for TTS
