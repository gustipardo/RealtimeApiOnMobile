# Story 2.2: Permission Grants (AnkiDroid + Microphone)

## Status: done

## Story

As a new user,
I want to grant the necessary permissions with clear explanations,
So that the app can access my Anki cards and my microphone.

## Acceptance Criteria

**Given** AnkiDroid is detected as installed
**When** the permissions screen is displayed
**Then:**

1. The app explains why AnkiDroid ContentProvider permission is needed before requesting it (FR31)
2. The system requests `com.ichi2.anki.permission.READ_WRITE_DATABASE` permission (FR30)
3. The system requests `RECORD_AUDIO` permission with explanation
4. If AnkiDroid permission is denied, the app shows guidance on how to grant it manually (FR36)
5. If microphone permission is denied, the app explains it's required and shows settings guidance (FR37)
6. The user can complete this step via tap only (FR32)

## Technical Context

- expo-permissions or react-native PermissionsAndroid for mic
- Custom intent for AnkiDroid permission (via native module)
- Linking to app settings for manual permission grants

## Tasks

- [ ] Add permission check methods to native module
- [ ] Create permission request UI with explanations
- [ ] Handle permission denied states with guidance
- [ ] Navigate to next step on success
