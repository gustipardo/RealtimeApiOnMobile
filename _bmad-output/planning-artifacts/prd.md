---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments:
  - '_bmad-output/planning-artifacts/research/technical-anki-mobile-sync-patterns-research-2026-01-19.md'
  - 'docs/index.md'
  - 'docs/project-overview.md'
  - 'docs/architecture.md'
  - 'docs/component-inventory.md'
  - 'docs/development-guide.md'
workflowType: 'prd'
documentCounts:
  research: 1
  brief: 0
  brainstorming: 0
  projectDocs: 6
classification:
  projectType: 'mobile_app'
  projectTypeDetail: 'voice-first mobile application'
  domain: 'edtech'
  domainDetail: 'personal learning / spaced repetition'
  complexity: 'medium'
  projectContext: 'brownfield'
  targetUsers: 'all Anki users'
  coreValue: 'hands-free, eyes-free Anki study through voice conversation'
---

# Product Requirements Document - APIxAnkiOnMobile

**Author:** Tobias
**Date:** 2026-01-19

## Executive Summary

**Product:** Voice-first mobile Anki study application

**Core Value Proposition:** Hands-free, eyes-free Anki flashcard study through AI-powered voice conversation, enabling learning in situations previously impossible (driving, walking, cooking, exercising).

**Target Users:** All Anki users who want to study without looking at a screen.

**Platform:** Android-first (MVP), iOS planned for Growth phase.

**Differentiator:** The AI voice conversation isn't just convenient - it's pedagogically superior. Speaking answers aloud, receiving semantic evaluation, and having dialogue around mistakes creates deeper active recall than silent card flipping.

---

## Success Criteria

### User Success

| Metric | Target | Measurement |
|--------|--------|-------------|
| Hands-free session completion | User completes all daily due cards without touching phone | Session completion rate |
| Voice-activated start | User can start session with voice command | Feature works reliably |
| Answer evaluation accuracy | 90%+ match with user's intended self-grade | User correction rate <10% |
| Session satisfaction | User feels session was "worth it" | In-app feedback rating |

**The "aha!" moment:** User finishes their entire daily review while driving/walking/cooking, realizes they just studied without looking at a screen once.

### Business Success (3-Month MVP Validation)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Returning users | 50 users with 3+ completed sessions | Analytics |
| User feedback volume | Actionable feedback from 20%+ of active users | In-app feedback submissions |
| Qualitative signal | Users say "I can't go back to regular Anki" | Feedback content analysis |

### Technical Success

| Metric | Target | Measurement |
|--------|--------|-------------|
| Response latency | Conversational feel (<2 seconds) | P95 latency monitoring |
| Session reliability | Zero crashes during study session | Crash-free session rate 99%+ |
| Audio quality | Clear AI voice, accurate speech recognition | User feedback |
| Connectivity | Internet required | Documented requirement |

---

## User Journeys

### Primary Persona: Marcus

**Profile:** Marcus, 35, night security guard. His job requires constant monitoring and patrol of a designated area. Most nights nothing happens, making work monotonous. His main responsibility is to stay alert and observe.

**Situation:** To avoid boredom and make better use of time, Marcus wants to learn new things while working. He's created Anki decks for studying (currently: real estate license exam).

**Constraint:** Cannot use phone or look at screens for long periods while on duty, but CAN talk, think, and dedicate cognitive effort to another task without affecting job performance.

**Goal:** Study Anki cards through voice conversation, making work hours feel productive while staying effective at his job.

---

### Journey 1: Marcus - Daily Study Session (Success Path)

**Opening Scene:**

Marcus arrives at the warehouse for his 10 PM shift. He's got 8 hours ahead - walking the perimeter, checking doors, watching monitors. His body needs to be here, but his mind is free.

He's been using Anki for 6 months to study for his real estate license exam. 200 cards in his deck, 45 due tonight. Normally he'd cram them during lunch break, squinting at his phone under harsh fluorescent lights. But tonight is different.

He pulls out his phone, opens the app, puts in his earbuds, and says: **"Start my reviews."**

**Rising Action:**

The AI responds: *"You have 45 cards due in Real Estate Fundamentals. Let's begin. First question: What is the difference between a general warranty deed and a special warranty deed?"*

Marcus thinks as he walks past the loading dock. He answers aloud: *"A general warranty deed covers the entire history of the property, and a special warranty deed only covers the time the seller owned it."*

The AI: *"Correct. The general warranty deed provides the broadest protection, covering all defects in title regardless of when they occurred. Next question..."*

Card after card, Marcus patrols and studies. He mishears one question, says "repeat that" and the AI obliges. He gets one wrong - the AI explains the correct answer, and he makes a mental note to review that concept.

**Climax:**

An hour into his shift, during a routine perimeter check, Marcus hears: *"That's all 45 cards completed. You got 38 correct, 7 incorrect. Your session is complete. Great work tonight."*

He didn't touch his phone once. He didn't break patrol. He turned dead time into study time.

**Resolution:**

Marcus finishes his shift knowing he's one day closer to his real estate license. The hours didn't drag - they flew. Tomorrow night, he'll have new cards due, and he'll knock those out too.

---

### Journey 2: Marcus - Network Failure (Edge Case)

**The Scenario:**

Marcus is 20 cards into his session when he walks into the basement level - a dead zone. The connection drops.

**What Happens:**

1. Audio cuts out mid-question
2. App detects network loss
3. App speaks: *"Connection lost. Your progress is saved. I'll resume when you're back online."*
4. Marcus continues his patrol
5. 5 minutes later, connection restores
6. App speaks: *"We're back. Ready to continue where you left off?"*
7. Marcus says "Yes" and picks up at card 21

**Capabilities Revealed:** Graceful offline handling, progress persistence, automatic reconnection, session resume.

---

### Journey 3: First-Time Setup (Onboarding)

**The Story:**

Marcus downloads the app after seeing a Reddit post about "studying Anki hands-free."

**Opening Scene:**

He opens the app. He's skeptical - he's tried "voice assistant" apps before and they were janky.

**Setup Flow:**

1. App explains: *"This app lets you study your Anki cards through voice conversation."*

2. App asks: *"Do you have AnkiDroid installed?"*
   - Marcus says "Yes"

3. App requests permission: *"To access your decks, I need permission to read from AnkiDroid."*
   - System permission dialog appears
   - Marcus grants it

4. App syncs: *"Found 3 decks: Real Estate Fundamentals (200 cards), Spanish Basics (150 cards), Random Trivia (50 cards). Which deck would you like to study?"*
   - Marcus says "Real Estate"

5. App confirms: *"Great. Say 'Start my reviews' anytime to begin studying Real Estate Fundamentals. You have 45 cards due today."*

**Resolution:**

Setup took 2 minutes. Marcus didn't have to type anything. He's ready to study on his first patrol tonight.

---

### Journey Requirements Summary

| Journey | Capabilities Revealed |
|---------|----------------------|
| **Daily Study Session** | Voice session start, AI question/answer flow, semantic evaluation, "repeat" command, session completion summary, hands-free operation |
| **Network Failure** | Offline detection, progress persistence, auto-reconnect, session resume, graceful degradation |
| **First-Time Setup** | Voice-first onboarding, AnkiDroid permission flow, deck discovery, deck selection, zero-typing setup |

---

## Innovation & Novel Patterns

### Detected Innovation Areas

| Innovation | Description |
|------------|-------------|
| **Voice-First Interaction Paradigm** | Replacing screen-based flashcard study with conversational AI interaction |
| **Accessibility Breakthrough** | Enabling visually impaired users to use spaced repetition systems for the first time |
| **Context Expansion** | Unlocking study time in hands/eyes-occupied situations (driving, walking, security patrol, housework) |
| **Semantic Evaluation** | AI judges answer correctness conversationally, not via exact text match |

### Market Context & Competitive Landscape

- **Existing attempt:** One competitor tried voice-based flashcards but executed poorly
- **Market signal:** Validates demand exists, but solution quality was insufficient
- **Opportunity:** Quality execution of validated concept with AI advances (OpenAI Realtime API) unavailable to prior attempts

### Validation Approach

| What We're Validating | How We'll Know |
|----------------------|----------------|
| Voice modality is the draw | Users acquired despite friction (paid/effort) return 3+ times |
| AI evaluation works | <10% correction rate on answer judgments |
| Hands-free completion | Users finish full sessions without phone touch |
| Accessibility value | Visually impaired users successfully complete sessions |

---

## Mobile App Specific Requirements

### Project-Type Overview

| Attribute | Decision |
|-----------|----------|
| **Framework** | React Native (Expo) |
| **Platform** | Android-first (MVP), iOS future |
| **Connectivity** | Internet required |
| **Audio Mode** | Background audio enabled |

### Platform Requirements

| Requirement | Details |
|-------------|---------|
| **Minimum Android Version** | Android 8.0+ (API 26) - covers 95%+ of devices |
| **React Native Version** | Latest stable with Expo |
| **Native Bridge** | Custom Kotlin module for AnkiDroid ContentProvider |

### Device Permissions

| Permission | Purpose | Required |
|------------|---------|----------|
| `RECORD_AUDIO` | Voice input for answers | Yes |
| `INTERNET` | OpenAI API, AnkiWeb sync | Yes |
| `READ_WRITE_DATABASE` (AnkiDroid) | Access Anki cards | Yes |
| `FOREGROUND_SERVICE` | Background audio playback | Yes |
| `WAKE_LOCK` | Prevent CPU sleep during session | Yes |

### Background Audio Implementation

| Aspect | Approach |
|--------|----------|
| **Service Type** | Android Foreground Service with notification |
| **Audio Focus** | Request `AUDIOFOCUS_GAIN` for exclusive audio |
| **Notification** | Persistent notification showing current card/progress |
| **Controls** | Notification actions: Pause, Skip, End Session |
| **Screen Off Behavior** | Session continues, audio keeps playing |

### Offline Mode (MVP)

| Scenario | Behavior |
|----------|----------|
| No internet at launch | Show error, cannot start session |
| Connection lost mid-session | Pause, notify, auto-resume on reconnect |
| Airplane mode | Cannot function (requires OpenAI API) |

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Native App                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   UI Layer  │  │   State     │  │   Audio Manager     │  │
│  │   (React)   │  │   (Zustand) │  │   (expo-av)         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          │                                   │
│  ┌───────────────────────┴───────────────────────────────┐  │
│  │              Native Bridge Layer (Kotlin)              │  │
│  │  ┌─────────────────┐  ┌─────────────────────────────┐ │  │
│  │  │ AnkiDroid       │  │ Foreground Service          │ │  │
│  │  │ ContentProvider │  │ (Background Audio)          │ │  │
│  │  └─────────────────┘  └─────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
              ▼               ▼               ▼
      ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
      │  AnkiDroid  │ │  OpenAI     │ │  Local      │
      │  (Cards)    │ │  Realtime   │ │  SQLite     │
      └─────────────┘ └─────────────┘ └─────────────┘
```

### Implementation Considerations

| Area | Consideration |
|------|---------------|
| **WebRTC on React Native** | Use `react-native-webrtc` or Expo equivalent |
| **Audio Focus** | Must handle interruptions (calls, other apps) gracefully |
| **Battery** | Foreground service + WebRTC = battery drain; document for users |
| **Memory** | Long sessions need memory management for card data |

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP - validate that voice-based Anki review is compelling enough that users return repeatedly.

**Core Hypothesis:** Anki users will complete their daily reviews through voice conversation instead of screen-based study, and find it superior enough to make it their default study method.

**Resource Requirements:** One developer with React Native (Expo) + Kotlin native module experience. Web prototype de-risks the AI interaction pattern.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Journey 1: Daily Study Session (full support)
- Journey 2: Network Failure (graceful handling)
- Journey 3: First-Time Setup (complete onboarding)

**Must-Have Capabilities:**

| Capability | Justification |
|---|---|
| Voice conversation with AI tutor | This IS the product |
| Semantic answer evaluation (correct/incorrect, synonym-tolerant, order-independent) | Without it, it's just TTS reading cards |
| AnkiDroid ContentProvider integration (read cards, read decks, trigger sync) | No cards = no product |
| Session start/stop via voice command | Hands-free is the core promise |
| "Repeat" voice command | User cannot look at screen to re-read |
| "Skip" voice command | Essential escape hatch |
| Session completion summary (spoken) | Users need closure and progress signal |
| Background audio via Android Foreground Service (screen off) | Users can't hold phone during patrol/driving/cooking |
| Network interruption handling + auto-resume | Sessions will drop; ungraceful failure kills trust |
| Basic onboarding (AnkiDroid permission grant, deck selection) | Zero-friction setup is part of the value |
| Voice self-correction ("Actually, mark that correct") | Safety valve for AI evaluation errors |

**Explicitly Out of MVP Scope:**

| Feature | Why Deferred |
|---|---|
| Card creation | Users already create cards in Anki |
| Bidirectional sync (review history back to Anki) | Not needed to validate core hypothesis |
| iOS support | Validate on Android first |
| Offline mode | Requires on-device models - massive scope increase |
| Review statistics in-app | Anki already provides this |
| Push notification reminders | Users already have Anki study habits |
| Multiple deck support in single session | Single deck validates the experience |
| Streak tracking | Enhancement, not core value |

### Post-MVP Features

**Phase 2 (Growth):**
- Bidirectional sync via .apkg import (review history back to Anki)
- Review statistics and progress tracking in-app
- Enhanced error recovery ("Could you repeat that?" improvements)
- Multiple deck support in single session
- Streak tracking
- Push notification reminders (daily due cards, streak maintenance)

**Phase 3 (Expansion):**
- iOS version with file-based .apkg sync
- Card creation via voice conversation
- Offline voice processing (on-device models)
- Wear OS / Android Auto integration
- Multi-language support
- Passive "podcast-like" review mode

### Risk Mitigation Strategy

**Technical Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| AI evaluation inaccuracy | Users lose trust in grading | Voice self-correction command ("Actually, mark that correct"); target <10% correction rate |
| WebRTC battery drain | Users abandon long sessions | Document expected battery usage; optimize session length; foreground service notification shows progress |
| OpenAI API latency >2s | Breaks conversational feel | Preload next card during feedback delivery; target <2s P95 response time |
| AnkiDroid ContentProvider API changes | Integration breaks | Pin to stable API version; monitor AnkiDroid releases |
| Voice recognition fails in noisy environments | Users can't interact | Allow "repeat" and "skip" commands as escape hatches |

**Market Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| Users prefer screen-based study | No adoption | Voice modality validated by web prototype usage; visual display always available as fallback |
| Prior competitor stigma | Users skeptical of "voice flashcards" | Differentiate through AI quality (OpenAI Realtime API) unavailable to prior attempts |
| Small addressable market | Not enough users | Anki has millions of users; even small % adoption is viable |

**Resource Risks:**

| Risk | Impact | Mitigation |
|---|---|---|
| Solo developer bandwidth | Scope creep delays launch | This MVP feature list and nothing more; web prototype reduces unknowns |
| AnkiDroid not installed on user device | Dead end at onboarding | Detect early, link to Play Store, explain requirement clearly |
| React Native + Kotlin bridge complexity | Development slowdown | Web prototype validates interaction pattern; native bridge is well-documented |

---

## Functional Requirements

### Voice Study Session

- **FR1:** User can start a study session via voice command
- **FR2:** User can end a study session via voice command
- **FR3:** User can hear the current card's question read aloud by the AI tutor
- **FR4:** User can answer card questions by speaking aloud
- **FR5:** System can evaluate spoken answers semantically (synonym-tolerant, order-independent)
- **FR6:** User can hear whether their answer was evaluated as correct or incorrect
- **FR7:** User can hear the correct answer revealed after an incorrect evaluation
- **FR8:** System can automatically advance to the next card after evaluation and feedback
- **FR9:** User can request the current question be repeated via voice command ("repeat")
- **FR10:** User can skip the current card via voice command ("skip")
- **FR11:** User can override an AI evaluation via voice command ("actually, mark that correct")
- **FR12:** User can hear a session completion summary (cards reviewed, correct/incorrect counts)

### Anki Integration

- **FR13:** System can read deck structure from AnkiDroid via ContentProvider API
- **FR14:** System can read card content (front/back fields) from AnkiDroid
- **FR15:** System can read due card queue from AnkiDroid
- **FR16:** System can trigger AnkiDroid to sync with AnkiWeb after session completion to ensure card data stays current across user's devices
- **FR17:** User can select which deck to study

### Background Audio & Session Persistence

- **FR18:** User can continue a study session with the screen off
- **FR19:** System can display a persistent notification during active session with progress info
- **FR20:** User can pause/resume a session from the notification controls
- **FR21:** User can end a session from the notification controls
- **FR22:** System can handle audio focus interruptions (incoming calls, other apps) and resume gracefully

### Network Resilience

- **FR23:** System can detect network connectivity loss during a session
- **FR24:** System can notify the user of connection loss via audio
- **FR25:** System can preserve session progress during network interruption
- **FR26:** System can automatically reconnect and resume the session when connectivity is restored
- **FR27:** User can confirm resumption after reconnection

### Onboarding & Setup

- **FR28:** System can detect whether AnkiDroid is installed on the device
- **FR29:** System can prompt the user to install AnkiDroid if not present
- **FR30:** System can request AnkiDroid ContentProvider permission from the user
- **FR31:** System can explain why the permission is needed before requesting
- **FR32:** User can complete onboarding setup without typing (voice or tap only)
- **FR33:** System can display available decks after successful permission grant

### Error Handling

- **FR34:** System can detect when AnkiDroid has no decks available and inform the user
- **FR35:** System can detect when no cards are due in the selected deck and inform the user
- **FR36:** System can fall back gracefully if AnkiDroid ContentProvider is unavailable
- **FR37:** System can detect microphone permission denial and guide the user to grant it

### Visual Companion

- **FR38:** User can see the current card question and evaluation result on screen as an optional visual companion to the audio session

---

## Non-Functional Requirements

### Performance

- **NFR1:** AI voice response latency must be <2 seconds (P95) from end of user speech to start of AI speech to maintain conversational feel
- **NFR2:** AnkiDroid card data retrieval must complete within 1 second for deck loading
- **NFR3:** Session startup (from voice command to first card read) must complete within 5 seconds
- **NFR4:** Network reconnection must be attempted within 3 seconds of connectivity restoration

### Security

- **NFR5:** OpenAI API key must be stored securely (not in plaintext, not in source code, not exposed to other apps)
- **NFR6:** No user credentials are stored by the application (AnkiWeb auth handled by AnkiDroid)
- **NFR7:** Card data read from AnkiDroid must be cached in memory at session start for session duration, but not persisted to disk beyond the active session

### Accessibility

- **NFR8:** All study session functionality must be fully operable without visual interaction (eyes-free)
- **NFR9:** All study session functionality must be fully operable without touch interaction (hands-free)
- **NFR10:** Audio output must be clear and at user-controllable volume via system controls
- **NFR11:** Visual companion display must use sufficient contrast and font size for quick glance readability

### Integration

- **NFR12:** Application must function with AnkiDroid API v1.1.0 and handle API unavailability gracefully
- **NFR13:** Application must handle OpenAI Realtime API connection drops without data loss
- **NFR14:** AnkiDroid ContentProvider interactions must not interfere with AnkiDroid's own operation or sync schedule

### Reliability

- **NFR15:** Crash-free session rate must be 99%+ (no crashes during active study)
- **NFR16:** Session progress must survive app backgrounding and return to foreground
- **NFR17:** Audio session must continue uninterrupted when screen is locked
- **NFR18:** Application must handle Android lifecycle events (low memory, process kill) without losing session state where possible

---
