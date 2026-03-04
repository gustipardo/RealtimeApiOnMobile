# Story 1.3: Create AnkiDroid Native Module Skeleton

## Status: done

## Story

As a developer,
I want the Kotlin native module scaffold for AnkiDroid ContentProvider access,
So that the native bridge architecture is established for Epic 2 to implement.

## Acceptance Criteria

**Given** the Expo project with dev client from Story 1.1
**When** the native module is scaffolded
**Then:**

1. `modules/anki-droid/` directory exists with Expo module structure:
   - `expo-module.config.json`
   - `index.ts`
   - `android/src/main/java/expo/modules/ankidroid/AnkiDroidModule.kt`

2. `AnkiDroidModule.kt` has stub methods:
   - `isInstalled(): Promise<Boolean>`
   - `getDeckNames(): Promise<List<String>>`
   - `getDueCards(deckName: String): Promise<List<ReadableMap>>`
   - `triggerSync(): Promise<Unit>`

3. `src/native/ankiBridge.ts` provides typed JS wrappers for all native methods

4. The module registers correctly and the app builds with the native module included

5. Calling `ankiBridge.isInstalled()` returns a boolean without crashing

## Technical Context

- Uses Expo Modules API for native module structure
- Kotlin for Android implementation
- TypeScript for JS wrapper with proper typing
- Module must integrate with existing Expo dev client setup

## Dependencies

- Story 1.1 (Expo project initialization) - DONE
- Story 1.2 (Zustand stores and types) - DONE

## Tasks

- [x] Create `modules/anki-droid/` directory structure
- [x] Create `expo-module.config.json` with module configuration
- [x] Create `AnkiDroidModule.kt` with stub implementations
- [x] Create `index.ts` to export native module
- [x] Create `src/native/ankiBridge.ts` with typed wrappers
- [x] Register module in app configuration (via package.json local dependency)
- [x] Expo autolinking detects module correctly
- [ ] Build and verify module loads without crash (requires Android SDK)
- [ ] Test `isInstalled()` returns boolean (requires device/emulator)
