# Story 2.5: Implement AnkiDroid Native Bridge (ContentProvider Queries)

## Status: done

## Story

As a developer,
I want the AnkiDroid native module to actually query the ContentProvider,
So that deck and card data flows from AnkiDroid into the app.

## Acceptance Criteria

**Given** the native module skeleton from Epic 1
**When** the ContentProvider queries are implemented in AnkiDroidModule.kt
**Then:**

1. `getDeckNames()` queries `content://com.ichi2.anki.flashcards/decks` and returns deck names
2. `getDueCards(deckName)` queries due cards and returns AnkiCard objects with cardId, front, back, deckName fields
3. Card content has HTML stripped via `cleanAnkiText` (ported to `src/utils/textUtils.ts`)
4. `triggerSync()` sends the `com.ichi2.anki.DO_SYNC` broadcast intent (FR16)
5. All native bridge errors are caught and returned as typed BridgeError with codes
6. ContentProvider interactions do not interfere with AnkiDroid's own operation (NFR14)
7. The Android manifest includes the `<queries>` block for `com.ichi2.anki`

## Technical Context

- AnkiDroid API: https://github.com/ankidroid/Anki-Android/wiki/AnkiDroid-API
- ContentProvider URIs:
  - Decks: content://com.ichi2.anki.flashcards/decks
  - Notes: content://com.ichi2.anki.flashcards/notes
  - Schedule: For due cards scheduling info

## Tasks

- [ ] Implement getDeckNames() ContentProvider query
- [ ] Implement getDueCards() ContentProvider query
- [ ] Create cleanAnkiText utility for HTML stripping
- [ ] Implement triggerSync() broadcast intent
- [ ] Add proper error handling with typed errors
