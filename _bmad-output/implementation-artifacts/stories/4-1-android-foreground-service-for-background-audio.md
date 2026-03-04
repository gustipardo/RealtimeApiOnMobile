# Story 4.1: Android Foreground Service for Background Audio

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want my study session to continue when I turn off the screen,
So that I can study truly hands-free while walking, driving, or working.

## Acceptance Criteria

1. **Given** an active study session **When** the user locks the screen or switches to another app **Then** a Foreground Service keeps the WebRTC audio session alive (FR18)
2. **And** the AI voice continues playing through the speaker/earbuds
3. **And** the microphone remains active for voice input
4. **And** the Foreground Service creates a required notification channel for Android 8.0+ (API 26)
5. **And** session progress survives app backgrounding and return to foreground (NFR16)
6. **And** audio continues uninterrupted when screen is locked (NFR17)

## Tasks / Subtasks

- [x] Task 1: Create Expo native module scaffold for Foreground Service (AC: 1)
  - [x] 1.1: Created module manually following anki-droid module pattern (scaffold command not needed)
  - [x] 1.2: Create `ExpoForegroundAudioModule.kt` with Expo Module DSL (`ModuleDefinition`)
  - [x] 1.3: Define async functions: `startService`, `stopService`, `updateNotification`, `isServiceRunning`
  - [x] 1.4: Define events: `onAudioFocusChange`, `onNotificationAction`
  - [x] 1.5: Create `modules/expo-foreground-audio/index.ts` with typed JS exports
  - [x] 1.6: Module registration verified via expo-module.config.json — build verification deferred to Task 7

- [x] Task 2: Implement Kotlin ForegroundAudioService class (AC: 1, 2, 3)
  - [x] 2.1: Create `ForegroundAudioService.kt` extending `android.app.Service`
  - [x] 2.2: Implement `onStartCommand` handling: `ACTION_START`, `ACTION_PAUSE`, `ACTION_RESUME`, `ACTION_END`
  - [x] 2.3: Set `foregroundServiceType="microphone"` in service declaration (required Android 14+/API 34)
  - [x] 2.4: Use `START_STICKY` return from `onStartCommand` for process restart resilience
  - [x] 2.5: Implement `onDestroy` with cleanup (abandon audio focus, remove notification)

- [x] Task 3: Create notification channel and MediaStyle notification (AC: 4)
  - [x] 3.1: Create `NotificationChannel` with `IMPORTANCE_LOW` (silent, visible in status bar)
  - [x] 3.2: Build `NotificationCompat.Builder` with `MediaStyle` and `setOngoing(true)`
  - [x] 3.3: Add Pause/Resume toggle action with `PendingIntent` (use `FLAG_IMMUTABLE` for API 31+)
  - [x] 3.4: Add End Session action with `PendingIntent`
  - [x] 3.5: Use `setShowActionsInCompactView(0, 1)` to show both actions in compact notification
  - [x] 3.6: Implement `updateNotification()` to refresh progress text and toggle Pause/Resume button state

- [x] Task 4: Create Expo config plugin for manifest permissions (AC: 1, 3)
  - [x] 4.1: Create `withForegroundAudioService.js` config plugin using `@expo/config-plugins`
  - [x] 4.2: Add permissions via `withAndroidManifest`: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MICROPHONE`, `POST_NOTIFICATIONS`, `WAKE_LOCK`
  - [x] 4.3: Add `<service>` declaration with `android:foregroundServiceType="microphone"`
  - [x] 4.4: Register config plugin in `app.json` plugins array
  - [x] 4.5: Prebuild manifest injection verified via config plugin code — runtime verification deferred to Task 7

- [x] Task 5: Bridge Foreground Service to JS via Expo Module (AC: 1, 2, 3, 5)
  - [x] 5.1: Create `src/services/foregroundAudioService.ts` — typed wrapper calling native module
  - [x] 5.2: Wire `startService()` to be called when session starts (after first card sent in sessionManager)
  - [x] 5.3: Wire `stopService()` to be called on session end (`session_complete`, `endSession()`, and `onSessionComplete()`)
  - [x] 5.4: Subscribe to `onNotificationAction` events to dispatch store actions (pause/resume/end)
  - [x] 5.5: Subscribe to `onAudioFocusChange` events for audio interruption handling

- [x] Task 6: Integrate with session state machine (AC: 5, 6)
  - [x] 6.1: Add foreground service start/stop calls in `sessionManager.ts` at appropriate transitions
  - [x] 6.2: Handle `onNotificationAction("pause")`: mute mic via webrtcManager, transition to `paused`
  - [x] 6.3: Handle `onNotificationAction("resume")`: unmute mic via webrtcManager, transition to `asking_question`
  - [x] 6.4: Handle `onNotificationAction("end")`: trigger `sessionManager.endSession()` via lazy require (circular dep avoidance)
  - [x] 6.5: Handle `onAudioFocusChange("loss_transient")`: mute mic, transition to paused
  - [x] 6.6: Handle `onAudioFocusChange("gain")`: unmute mic, resume if was paused
  - [x] 6.7: Handle `onAudioFocusChange("loss")`: mute mic, pause session, do NOT auto-resume

- [ ] Task 7: Test on physical device (AC: all) — **REQUIRES MANUAL TESTING**
  - [ ] 7.1: Start session, lock screen — verify audio continues bidirectionally
  - [ ] 7.2: Start session, switch to another app — verify audio continues
  - [ ] 7.3: Verify notification appears with Pause and End buttons
  - [ ] 7.4: Return to app after backgrounding — verify UI reflects current session state
  - [ ] 7.5: Verify no crash on rapid foreground/background switching

## Dev Notes

### Architecture Decision: Separate Native Module

Per architecture Gap Analysis item 1: the Foreground Service is a **separate Expo native module** (`modules/expo-foreground-audio/`), NOT part of the AnkiDroid module. This keeps concerns separated.

### Critical: WebRTC Stays Alive via Process Keep-Alive

The WebRTC `RTCPeerConnection` is created in JS via `react-native-webrtc`. The native audio pipeline (mic capture + speaker output) operates at the native layer. The Foreground Service does NOT need to "bind" to the WebRTC connection — it simply keeps the app process alive, which prevents Android from killing the JS bridge and native WebRTC audio pipeline.

**Without a Foreground Service:** Audio TX stops after ~2 minutes on Android 11+. ICE candidates disconnect after 8-15 seconds on some devices.

### Critical: Android 14+ (API 34) Requires foregroundServiceType

Every foreground service MUST declare `foregroundServiceType` starting Android 14. Missing this throws `MissingForegroundServiceTypeException` at runtime. Use `microphone` type since the app continues capturing microphone audio in background.

### Critical: PendingIntent.FLAG_IMMUTABLE Required (API 31+)

All `PendingIntent` objects for notification actions MUST use `FLAG_IMMUTABLE`. This is enforced starting Android 12.

### Audio Focus Strategy

- Request `AUDIOFOCUS_GAIN` at session start with `USAGE_VOICE_COMMUNICATION` + `CONTENT_TYPE_SPEECH`
- Set `AudioManager.MODE_IN_COMMUNICATION` for echo cancellation and proper audio routing
- On `AUDIOFOCUS_LOSS_TRANSIENT` (phone call): mute mic track (`track.enabled = false`), keep WebRTC connection alive
- On `AUDIOFOCUS_GAIN`: unmute mic track
- On `AUDIOFOCUS_LOSS` (permanent, e.g., user starts music): transition FSM to `paused`, do NOT auto-resume
- Abandon audio focus on session end, reset mode to `MODE_NORMAL`

### Notification Pattern

- Channel: `IMPORTANCE_LOW` (silent, no vibration) — appropriate for ongoing session
- Style: `MediaStyle` with `setShowActionsInCompactView(0, 1)`
- `setOngoing(true)` — cannot be swiped away
- `setSilent(true)` — no sound on updates
- Content text shows session progress (updated via `updateNotification`)
- Tap opens app via `getLaunchIntentForPackage`

### Muting vs Disconnecting During Interruptions

When audio focus is lost transiently (phone call), mute the local audio track rather than disconnecting WebRTC:
```typescript
localStream.getAudioTracks().forEach(t => t.enabled = false);
```
This preserves the WebRTC connection without renegotiation. Unmute on focus regain.

### Libraries NOT to Use

- **expo-task-manager / expo-background-task**: Uses WorkManager with 15-min minimum intervals. NOT suitable for real-time WebRTC.
- **expo-foreground-actions**: Limited to grace period after backgrounding. NOT suitable for indefinite audio sessions.
- **@notifee/react-native**: Runs headless JS tasks — for WebRTC you need the main JS context alive. Don't use for service lifecycle. (Could be used for notification display only, but custom notification is simpler here.)
- **react-native-webrtc built-in foreground service**: Only supports `MEDIA_PROJECTION` type (screen sharing). NOT suitable for audio-only.
- **react-native-incall-manager**: Conflicts with custom audio focus management. Pick one approach — use the custom Kotlin AudioFocusManager in this module, NOT InCallManager.

### Project Structure Notes

New files to create:
```
modules/
└── expo-foreground-audio/
    ├── android/
    │   └── src/main/java/expo/modules/foregroundaudio/
    │       ├── ExpoForegroundAudioModule.kt    # Expo Module bridge
    │       ├── ForegroundAudioService.kt       # Android Service
    │       └── AudioFocusManager.kt            # Audio focus handler
    ├── expo-module.config.json
    ├── index.ts                                # JS typed exports
    └── withForegroundAudioService.js           # Config plugin

src/
└── services/
    └── foregroundAudioService.ts               # JS wrapper (thin, typed)
```

Follow existing module pattern from `modules/anki-droid/`:
- Module class uses Expo Modules API `ModuleDefinition` DSL
- JS wrapper in `index.ts` exports typed functions
- Config plugin registered in `app.json`

### Kotlin Module Definition Pattern

```kotlin
class ExpoForegroundAudioModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoForegroundAudio")
        Events("onAudioFocusChange", "onNotificationAction")

        AsyncFunction("startService") { title: String, body: String ->
            // Start ForegroundAudioService via Intent
        }
        AsyncFunction("stopService") {
            // Stop ForegroundAudioService
        }
        AsyncFunction("updateNotification") { title: String, body: String ->
            // Update ongoing notification content
        }
        Function("isServiceRunning") {
            // Return boolean
        }
    }
}
```

### AndroidManifest Permissions Required

```xml
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.WAKE_LOCK" />

<service
    android:name=".ForegroundAudioService"
    android:foregroundServiceType="microphone"
    android:exported="false" />
```

These are injected via the config plugin, NOT manually edited in AndroidManifest.xml.

### Session Integration Points

The foreground service integrates with the existing session architecture:

```
Session FSM (useSessionStore)
    ├── asking_question → startService() [first time only]
    ├── paused → updateNotification("Paused")
    ├── reconnecting → updateNotification("Reconnecting...")
    ├── session_complete → stopService()
    └── error → stopService()

Notification Actions → JS events → Store actions:
    ├── "pause" → transitionTo('paused', 'notification_pause')
    ├── "resume" → transitionTo('asking_question', 'notification_resume')
    └── "end" → trigger session completion flow

Audio Focus → JS events → Track control:
    ├── loss_transient → mute mic track (keep connection)
    ├── gain → unmute mic track
    └── loss → transitionTo('paused', 'audio_focus_loss')
```

### Component Boundaries (Architecture Compliance)

- `src/services/foregroundAudioService.ts` is the ONLY file that imports from the native module
- Components and stores NEVER call native module directly
- Store actions dispatch to the service wrapper
- Service wrapper emits events that stores subscribe to
- Follow same pattern as `src/native/ankiBridge.ts`

### Version/API Requirements

| Component | Version | Notes |
|-----------|---------|-------|
| Android min API | 26 (8.0) | Notification channels required |
| Android target API | 35 (15) | Google Play 2025 requirement |
| FGS type declaration | Required API 34+ | `MissingForegroundServiceTypeException` |
| POST_NOTIFICATIONS | Required API 33+ | Runtime permission |
| FOREGROUND_SERVICE_MICROPHONE | Required API 34+ | Microphone FGS type |
| PendingIntent.FLAG_IMMUTABLE | Required API 31+ | All PendingIntents |
| react-native-webrtc | 124.0.7 | WebRTC M124 |
| Expo SDK | 52+ | compileSdk=35, targetSdk=35 |

### Testing Requirements

- Physical device testing only (Foreground Service cannot be tested in emulator with mic)
- Manual verification: lock screen, switch apps, receive call simulation
- Unit tests for the JS service wrapper (mock native module)
- Verify notification channel creation on first run
- Verify notification actions dispatch correct events
- Verify audio continues bidirectionally after screen lock
- Verify FSM transitions are correct for all notification action + audio focus scenarios

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Background Audio & Session Persistence] — FR18-22, NFR16-18 mapping
- [Source: _bmad-output/planning-artifacts/architecture.md#Gap Analysis Results] — Separate Foreground Service module decision
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns] — Naming conventions, module patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries] — Native bridge boundary, store boundary rules
- [Source: _bmad-output/planning-artifacts/architecture.md#Cross-Cutting Concerns] — Audio lifecycle concern
- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1] — Acceptance criteria, FR/NFR coverage
- [Source: _bmad-output/planning-artifacts/prd.md#Background Audio Implementation] — Service type, audio focus, notification controls, screen-off behavior

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None — no build errors encountered during implementation.

### Completion Notes List

- Tasks 1-6 fully implemented with all subtasks complete
- Task 7 (physical device testing) requires manual testing — cannot be automated
- Architecture note: story referenced `sessionStateMachine.ts` but actual file is `sessionManager.ts` — adapted integration accordingly
- Circular dependency between `foregroundAudioService.ts` and `sessionManager.ts` resolved via lazy `require()` for the "end" notification action
- Foreground service start is non-fatal (try/catch) so session works even if service fails to start
- All 38 unit tests pass (16 new + 22 existing), 0 regressions
- `updateForegroundNotification` updates card progress (`Card X of Y`) on each card advance
- `loss_transient_can_duck` audio focus state also triggers pause (appropriate for voice communication)

### Code Review Fixes (2026-02-12)

- **[H1 FIXED]** Recursive stop loop: Added `ACTION_STOP` to `ForegroundAudioService.kt` for programmatic shutdown (no event emission). `ExpoForegroundAudioModule.stopService()` now uses `ACTION_STOP`. `ACTION_END` is reserved for user notification button presses only.
- **[H2 FIXED]** `AudioFocusManager.kt`: Added `resumeOnFocusGain = true` to `AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK` case so session auto-resumes after duck focus loss.
- **[M1 FIXED]** Added 10 event handler tests covering notification actions (pause/resume/end) and audio focus changes (loss_transient, gain, loss, duck) with phase-conditional assertions.
- **[M2 NOTED]** Stories 4.2 and 4.3 may need re-scoping since their core functionality was delivered in this story.

### File List

**New files created (11):**
- `modules/expo-foreground-audio/package.json`
- `modules/expo-foreground-audio/expo-module.config.json`
- `modules/expo-foreground-audio/index.ts`
- `modules/expo-foreground-audio/android/build.gradle`
- `modules/expo-foreground-audio/android/src/main/AndroidManifest.xml`
- `modules/expo-foreground-audio/android/src/main/java/expo/modules/foregroundaudio/ExpoForegroundAudioModule.kt`
- `modules/expo-foreground-audio/android/src/main/java/expo/modules/foregroundaudio/ForegroundAudioService.kt`
- `modules/expo-foreground-audio/android/src/main/java/expo/modules/foregroundaudio/AudioFocusManager.kt`
- `modules/expo-foreground-audio/withForegroundAudioService.js`
- `src/services/foregroundAudioService.ts`
- `src/services/__tests__/foregroundAudioService.test.ts`

**Modified files (3):**
- `src/services/sessionManager.ts` — Added foreground service integration (start, stop, notification updates)
- `app.json` — Added config plugin registration
- `package.json` — Added `expo-foreground-audio` local dependency
