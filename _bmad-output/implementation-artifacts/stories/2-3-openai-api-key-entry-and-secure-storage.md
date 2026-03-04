# Story 2.3: OpenAI API Key Entry and Secure Storage

## Status: done

## Story

As a new user,
I want to enter my OpenAI API key securely,
So that the app can connect to the AI voice service.

## Acceptance Criteria

**Given** permissions are granted
**When** the API key entry screen is displayed
**Then:**

1. The user can enter their OpenAI API key
2. The key is stored via expo-secure-store (NFR5)
3. The key is never displayed in plaintext after entry
4. `useSettingsStore.apiKeyStored` flag is set to true
5. The user can re-enter the key later if needed from settings
6. Onboarding is marked complete after successful key storage

## Technical Context

- expo-secure-store for encrypted storage
- SecureTextEntry for input field
- useSettingsStore for apiKeyStored flag

## Tasks

- [ ] Create secure key storage utility
- [ ] Implement API key entry UI
- [ ] Store key securely on submit
- [ ] Mark onboarding complete
- [ ] Navigate to deck selection
