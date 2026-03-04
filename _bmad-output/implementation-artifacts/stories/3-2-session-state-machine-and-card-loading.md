# Story 3.2: Session State Machine and Card Loading

## Status: done

## Story

As a user,
I want the study session to initialize by loading my due cards and preparing the AI tutor,
So that the session starts quickly and reliably.

## Acceptance Criteria

**Given** WebRTC connection is established
**When** the user starts a study session (FR1)
**Then:**

1. `services/cardLoader.ts` loads all due cards from AnkiDroid via `ankiBridge.getDueCards()` into `useCardCacheStore`
2. Card loading and WebRTC connection happen in parallel for <5s startup (NFR3)
3. `services/sessionStateMachine.ts` transitions from `idle` → `loading_cards` → `connecting` → `ready` → `asking_question`
4. The AI system prompt is configured with the `evaluate_and_move_next` tool function definition
5. The AI begins reading the first card's question aloud (FR3)
6. Card data is cached in memory only (NFR7)

## Technical Context

- Uses useSessionStore for phase management
- Uses useCardCacheStore for card queue
- Integrates with webrtcManager for AI communication

## Tasks

- [ ] Create cardLoader service
- [ ] Create sessionStateMachine service
- [ ] Configure AI system prompt with tool definition
- [ ] Implement session start flow
- [ ] Load cards into cache
- [ ] Trigger first card question
