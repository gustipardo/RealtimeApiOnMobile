# APIxAnkiOnMobile - Project Status Report

**Date:** 2026-03-07
**Author:** Product Manager
**Sprint Phase:** Epic 5 (Network Resilience & Session Recovery)

---

## Executive Summary

The MVP is approximately 90% complete. Epics 1 through 4 are done, delivering the full foundation, onboarding, core voice study session, and background audio capabilities. Epic 5 (the final epic) is in progress but both stories remain in backlog status, meaning implementation has not yet started on network resilience features.

All 38 functional requirements and 18 non-functional requirements from the PRD are fully covered by the existing epic breakdown (Epics 1-5). No additional epics are needed to reach MVP completeness.

---

## What Is Done

### Epic 1: Project Foundation & Development Environment -- DONE
- Expo project initialized with all dependencies (NativeWind, Zustand, react-native-webrtc, expo-secure-store, expo-dev-client)
- Zustand stores and TypeScript types scaffolded (session, card cache, connection, settings)
- AnkiDroid native module skeleton created with Kotlin bridge

### Epic 2: Onboarding & Anki Integration -- DONE
- AnkiDroid detection and Play Store installation prompt (FR28, FR29)
- Permission grants with explanations for ContentProvider and microphone (FR30, FR31, FR37)
- OpenAI API key entry with secure storage via expo-secure-store (NFR5)
- Deck listing with due card counts and selection (FR13, FR14, FR15, FR17, FR33, FR34, FR35)
- Full AnkiDroid native bridge with ContentProvider queries and sync trigger (FR16, FR36)
- Zero-typing onboarding flow (FR32)

### Epic 3: Voice Study Session -- DONE
- WebRTC connection to OpenAI Realtime API (FR1)
- Session state machine with full FSM transitions (all session phases)
- Core study loop: answer, evaluate semantically, feedback, auto-advance (FR3-FR8)
- Voice commands: repeat, skip, override, end session (FR9-FR11, FR2)
- Session completion summary spoken and displayed (FR12)
- AnkiDroid sync triggered on session end (FR16)
- Visual companion display with card question and evaluation result (FR38)

### Epic 4: Background Audio & Session Persistence -- DONE
- Android Foreground Service for screen-off study (FR18, NFR16, NFR17)
- Persistent notification with progress info, pause/resume, and end session controls (FR19, FR20, FR21)
- Audio focus management for interruptions like phone calls (FR22, NFR18)

---

## What Is In Progress

### Epic 5: Network Resilience & Session Recovery -- IN PROGRESS (0% implemented)

**Story 5.1: Network Loss Detection and User Notification** -- BACKLOG
- FR23: Detect network connectivity loss during session
- FR24: Notify user of connection loss via audio
- FR25: Preserve session progress during interruption

**Story 5.2: Auto-Reconnect and Session Resume** -- BACKLOG
- NFR4: Reconnection attempted within 3 seconds
- FR26: Auto-reconnect with exponential backoff (max 3 attempts)
- FR27: User confirms resumption after reconnection
- NFR13: No data loss during reconnection
- NFR15: 99%+ crash-free rate across reconnection scenarios

---

## What Is Remaining

Only Epic 5's two stories remain. Once completed, the MVP feature set is fully delivered.

| Remaining Work | Estimated Complexity | Dependencies |
|---|---|---|
| Story 5.1: Network loss detection + audio notification | Medium | Uses existing useConnectionStore, WebRTC state events |
| Story 5.2: Auto-reconnect + session resume | Medium-High | Depends on 5.1; requires WebRTC reconnection logic with retry, session state restoration |

---

## Requirements Coverage Audit

### Functional Requirements: 38/38 covered by Epics 1-5
All FRs from the PRD are mapped in the FR Coverage Map in epics.md. No gaps found.

### Non-Functional Requirements: 18/18 addressed
All NFRs are addressed through architectural decisions or explicit story acceptance criteria. Key NFR coverage:

| NFR | Coverage |
|---|---|
| NFR1 (voice latency <2s) | Epic 3, Story 3.3 acceptance criteria |
| NFR2 (card retrieval <1s) | Epic 2, Story 2.4 acceptance criteria |
| NFR3 (startup <5s) | Epic 3, Story 3.2 parallel loading |
| NFR4 (reconnect <3s) | Epic 5, Story 5.2 acceptance criteria |
| NFR5 (secure API key) | Epic 2, Story 2.3 (expo-secure-store) |
| NFR6 (no credentials) | Architectural constraint, no implementation needed |
| NFR7 (memory-only cache) | Epic 3, Story 3.2 acceptance criteria |
| NFR8-9 (eyes-free, hands-free) | Epic 4 Foreground Service + Epic 3 voice commands |
| NFR10 (audio volume) | System-level volume controls, no app logic needed |
| NFR11 (visual contrast) | Epic 3, Story 3.6 acceptance criteria |
| NFR12 (AnkiDroid API v1.1.0) | Epic 1, Story 1.3 pinned dependency |
| NFR13 (handle API drops) | Epic 5, Story 5.2 acceptance criteria |
| NFR14 (no AnkiDroid interference) | Epic 2, Story 2.5 acceptance criteria |
| NFR15 (99%+ crash-free) | Epic 5, Story 5.2 acceptance criteria |
| NFR16-18 (backgrounding, screen lock, lifecycle) | Epic 4, Stories 4.1 and 4.3 |

### New Epics Needed: None
The existing five epics fully cover the MVP scope defined in the PRD. Post-MVP features (Phase 2: bidirectional sync, statistics, multi-deck sessions, streaks, push notifications; Phase 3: iOS, card creation, offline mode, Wear OS) are explicitly deferred per the PRD scoping decisions.

---

## Risks and Concerns

### Active Risks

| Risk | Severity | Details |
|---|---|---|
| Epic 5 stalled | Medium | Both stories are in backlog despite the epic being marked "in-progress." No implementation work has started on network resilience. This is the last epic blocking MVP completion. |
| WebRTC reconnection complexity | Medium | Story 5.2 requires re-establishing a WebRTC session to OpenAI's Realtime API after a network drop. This involves SDP renegotiation, audio track re-attachment, and session context restoration. Edge cases (partial connectivity, rapid disconnect/reconnect cycles) could surface reliability issues. |
| NFR validation gaps | Low | Performance NFRs (latency <2s, startup <5s, reconnect <3s) and reliability NFRs (99%+ crash-free) have acceptance criteria in stories but no formal measurement or monitoring infrastructure. These will be validated through manual testing only. |

### Mitigated Risks (No Longer Active)

| Risk | Status |
|---|---|
| AnkiDroid ContentProvider integration | Resolved -- Epic 2 completed successfully |
| WebRTC on React Native compatibility | Resolved -- Epic 3 completed successfully |
| Foreground Service + audio focus | Resolved -- Epic 4 completed successfully |
| Solo developer bandwidth / scope creep | Managed -- strict MVP scope maintained across all 5 epics |

---

## Recommendation

**Priority: Complete Epic 5 to close out the MVP.**

The two remaining stories (5.1 and 5.2) should be moved from backlog to ready-for-dev and implemented sequentially. Story 5.1 (detection and notification) is a prerequisite for Story 5.2 (reconnection and resume). Together they represent the final user journey requirement: Marcus walking into a dead zone and having the session recover gracefully.

Once Epic 5 is done, the product is ready for MVP validation against the success criteria defined in the PRD (50 returning users with 3+ sessions, <10% answer correction rate, hands-free session completion).
