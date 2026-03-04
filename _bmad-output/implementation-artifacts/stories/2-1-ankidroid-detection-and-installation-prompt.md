# Story 2.1: AnkiDroid Detection and Installation Prompt

## Status: done

## Story

As a new user,
I want the app to detect if AnkiDroid is installed and guide me to install it if not,
So that I can set up the required dependency without confusion.

## Acceptance Criteria

**Given** the user opens the app for the first time
**When** the onboarding screen loads
**Then:**

1. The system checks for AnkiDroid installation via `ankiBridge.isInstalled()` (FR28)
2. If AnkiDroid is installed, the user proceeds to the permission step
3. If AnkiDroid is not installed, the app displays a message explaining the requirement and a button linking to the Play Store (FR29)
4. The AnkiDroid detection uses Android PackageManager to check for `com.ichi2.anki`
5. The onboarding flow is completable without typing (FR32)

## Technical Context

- Uses ankiBridge.isInstalled() from Epic 1
- Expo Router for navigation between onboarding steps
- Linking API to open Play Store
- NativeWind for styling

## Dependencies

- Story 1.3 (AnkiDroid Native Module) - DONE

## Tasks

- [ ] Create onboarding flow components
- [ ] Implement AnkiDroid detection screen
- [ ] Add Play Store link for installation
- [ ] Handle navigation between onboarding steps
- [ ] Style with NativeWind
