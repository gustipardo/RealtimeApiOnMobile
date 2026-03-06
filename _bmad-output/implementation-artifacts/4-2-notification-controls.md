# Story 4.2: Notification Controls (Pause, Resume, End)

Status: done

## Story

As a user studying with the screen off,
I want to control my session from the notification bar,
so that I can pause, resume, or stop without unlocking my phone.

## Acceptance Criteria

1. The persistent notification shows current progress (Card X of Y) during an active session.
2. The notification has a Pause/Resume toggle action button.
3. The notification has an End Session action button.
4. Tapping Pause: mutes mic, transitions FSM to `paused`, notification updates to show "Paused".
5. Tapping Resume: unmutes mic, transitions FSM to `asking_question`, notification restores progress text.
6. Tapping End Session triggers full session completion flow (AnkiDroid sync + FSM to `session_complete`).
7. The in-app session screen shows a visible "Paused" indicator and an in-app Resume button when FSM is `paused`.
8. Notification updates in real-time as cards progress (without user interaction).

## Known Bug: AnkiDroid Permission Request (Fix Required Before Testing)

**Bug:** `requestApiPermission()` in `AnkiDroidModule.kt:75-90` calls `getLaunchIntentForPackage` and `startActivity` — this opens AnkiDroid but does NOT show the permission grant dialog. The microphone permission works because it uses `PermissionsAndroid.request()` (standard Android API).

**Root cause confirmed:** Multiple "permission fix" commits in git history (`01cdf6f`, `4453eef`, `4d09392`) show this has been struggled with before.

**Fix (JS-side, simplest approach):**
In `permissions.tsx`, replace `ankiBridge.requestApiPermission()` with a direct `PermissionsAndroid.request()` call:

```typescript
// In permissions.tsx — handleRequestAnkiDroidPermission
async function handleRequestAnkiDroidPermission() {
  setIsRequesting(true);
  try {
    const result = await PermissionsAndroid.request(
      'com.ichi2.anki.permission.READ_WRITE_DATABASE' as any,
      {
        title: 'AnkiDroid Access',
        message: 'This app needs access to your AnkiDroid flashcard decks and due cards.',
        buttonPositive: 'Grant',
        buttonNegative: 'Deny',
      }
    );
    const granted = result === PermissionsAndroid.RESULTS.GRANTED;
    setPermissions((prev) => ({ ...prev, ankidroid: granted ? 'granted' : 'denied' }));
  } catch (error) {
    setPermissions((prev) => ({ ...prev, ankidroid: 'denied' }));
  }
  setIsRequesting(false);
}
```

React Native's `PermissionsAndroid` internally calls `ActivityCompat.requestPermissions`, which correctly shows the system permission dialog. The `ankiBridge.requestApiPermission()` call and the `AppState` listener can be removed from the component.

**Do NOT modify `AnkiDroidModule.kt`'s `requestApiPermission` function** — it's unused after this fix and can stay as dead code for now.

## Tasks / Subtasks

- [x] Task 1: Fix notification "End" to trigger session completion flow (AC: #6)
  - [x] 1.1 `endSessionFromNotification()` added to `sessionManager.ts` — already present in codebase
  - [x] 1.2 `stopForegroundService()` in `onSessionComplete()` is idempotent — confirmed
  - [x] 1.3 Transitions to `session_complete` via `endSessionFromNotification()` — confirmed

- [x] Task 2: Fix initial notification progress format (AC: #1)
  - [x] 2.1 `startSession()` already uses `Card 1 of ${cards.length}` — confirmed

- [x] Task 3: Add in-app pause state UI to session screen (AC: #7)
  - [x] 3.1 `session.tsx` already detects `sessionPhase === 'paused'` and renders pause screen — confirmed
  - [x] 3.2 In-app Resume button calling `sessionManager.resume()` already present — confirmed
  - [x] 3.3 End Session button accessible during pause — confirmed

- [x] Task 4: Fix AnkiDroid permission request
  - [x] 4.1 `permissions.tsx` updated: replaced `ankiBridge.requestApiPermission()` with `PermissionsAndroid.request('com.ichi2.anki.permission.READ_WRITE_DATABASE')`
  - [x] 4.2 Native permission dialog now shown via `ActivityCompat.requestPermissions` under the hood
  - [x] 4.3 `ankiBridge.hasApiPermission()` unaffected — uses `ContextCompat.checkSelfPermission`

- [x] Task 5: Update tests
  - [x] 5.1 `foregroundAudioService.test.ts` "end" action test fixed — module-level mock for `sessionManager`, verifies `endSessionFromNotification` called
  - [x] 5.2 In-app Resume button test deferred (React Native component testing requires additional setup beyond current test infra)

## Dev Notes

### Critical: What's Already Built — DO NOT Reinvent

Story 4.1 built the entire native infrastructure. Read these files before touching anything:

**Native module (Kotlin):**
- `modules/expo-foreground-audio/android/src/main/java/expo/modules/foregroundaudio/ForegroundAudioService.kt` — Foreground service with Pause/Resume toggle button, End button, ACTION_UPDATE for content refresh, `isPaused` state, `buildNotification()` already handles pause/resume toggle display
- `modules/expo-foreground-audio/android/src/main/java/expo/modules/foregroundaudio/ExpoForegroundAudioModule.kt` — `startService`, `stopService`, `updateNotification`, `isServiceRunning`, emits `onNotificationAction` and `onAudioFocusChange` events

**JS layer:**
- `modules/expo-foreground-audio/index.ts` — TypeScript interface, event types: `onNotificationAction: { action: 'pause' | 'resume' | 'end' }`, `onAudioFocusChange: { state: 'gain' | 'loss' | 'loss_transient' | 'loss_transient_can_duck' }`
- `src/services/foregroundAudioService.ts` — The ONLY file that imports the native module. Exposes: `startForegroundService`, `stopForegroundService`, `updateForegroundNotification`, `isServiceRunning`. Event listeners for `onNotificationAction` and `onAudioFocusChange` are registered here.
- `src/services/sessionManager.ts` — `startSession()` already calls `startForegroundService(...)`. `handleEvaluateAndMoveNext()` already calls `updateForegroundNotification('Voice Study Session', 'Card ${completed + 1} of ${total}')`. `onSessionComplete()` already calls `stopForegroundService()`.

**The AC-4 and AC-5 behaviors (pause/resume FSM transitions from notification) are already wired** in `foregroundAudioService.ts:58-78`. AC-2 and AC-3 (notification buttons) are already built in `ForegroundAudioService.kt`. AC-8 (real-time updates) is already implemented in `sessionManager.ts`.

**What this story adds:**
1. Bug fix: End → completion flow (Task 1)
2. Correct initial progress format (Task 2)
3. In-app pause UI (Task 3)
4. AnkiDroid permission fix (Task 4)

### Task 1 Detail: Fixing the "End" Completion Flow

**Current broken flow:**
```
User taps "End" notification button
  → ForegroundAudioService ACTION_END
  → stopSelf() [service dies]
  → emitNotificationAction("end")
  → foregroundAudioService.ts listener: sessionManager.endSession()
  → endSession(): stopForegroundService() [no-op], disconnect WebRTC, clearCards, transitionTo('idle')
  → ❌ No sync, no summary screen
```

**Fixed flow:**
```
User taps "End" notification button
  → (same native path)
  → foregroundAudioService.ts listener: sessionManager.endSessionFromNotification()
  → endSessionFromNotification(): transitionTo('session_complete'), onSessionComplete() [sync + stops service]
  → ✅ session_complete screen shown, sync triggered
```

**Implementation:** Add a new method `endSessionFromNotification()` to `SessionManager` class, OR modify the existing `end` case in `foregroundAudioService.ts` to call `onSessionComplete()` pathway. The cleanest approach:

In `sessionManager.ts`, expose `onSessionComplete` as a public method OR add `endSessionFromNotification()`:
```typescript
async endSessionFromNotification(): Promise<void> {
  const { transitionTo } = useSessionStore.getState();
  transitionTo('session_complete', 'notification_end');
  await this.onSessionComplete();
}
```

In `foregroundAudioService.ts`, update the `end` case:
```typescript
case 'end':
  const { sessionManager } = require('./sessionManager');
  sessionManager.endSessionFromNotification(); // was: sessionManager.endSession()
  break;
```

Note the lazy `require` is intentional (already there) to avoid circular dependency (`foregroundAudioService` ← `sessionManager` ← `foregroundAudioService`). Keep it as-is.

### Task 3 Detail: In-App Pause UI

In `session.tsx`, the active session render path (bottom of file) handles all phases except `connecting`, `loading_cards`, `error`, `session_complete`. Add a paused state branch:

```tsx
// Add BEFORE the "Active session UI" return:
if (sessionPhase === 'paused') {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-yellow-100">
        <Text className="text-5xl">⏸</Text>
      </View>
      <Text className="mb-2 text-center text-2xl font-bold text-gray-900">Session Paused</Text>
      <Text className="mb-8 text-center text-base text-gray-600">
        Resume from here or from the notification bar.
      </Text>
      <View className="w-full gap-3">
        <Pressable
          onPress={() => sessionManager.resume()}
          className="rounded-xl bg-blue-500 px-6 py-4 active:bg-blue-600"
        >
          <Text className="text-center text-lg font-semibold text-white">Resume Session</Text>
        </Pressable>
        <Pressable
          onPress={handleEndSession}
          className="rounded-xl border-2 border-red-300 px-6 py-4 active:bg-red-50"
        >
          <Text className="text-center text-lg font-semibold text-red-600">End Session</Text>
        </Pressable>
      </View>
    </View>
  );
}
```

`sessionManager.resume()` already exists and calls `webrtcManager.setMicrophoneMuted(false)` + `transitionTo('asking_question')`. Use it directly.

### Project Structure Notes

- Native module lives at `modules/expo-foreground-audio/` (NOT `modules/audio-service/` as architecture draft mentioned — the actual name is `expo-foreground-audio`)
- The module is imported in JS as `'expo-foreground-audio'` (see `foregroundAudioService.ts:1`)
- All interaction with the native module goes through `src/services/foregroundAudioService.ts` — maintain this single-import rule
- The architecture doc mentions `services/audioManager.ts` — this does NOT exist in the codebase; `foregroundAudioService.ts` is the equivalent
- Do NOT create `audioManager.ts` — it would be a duplicate

### NativeWind / Styling

- Use NativeWind v4.2+ with TailwindCSS v3.4.17 classes (already used throughout `session.tsx`)
- Follow the existing color palette: `bg-blue-500` for primary actions, `bg-red-500`/`border-red-300` for destructive actions, `bg-yellow-100` for warning states
- Use `rounded-xl`, `px-6 py-4`, `text-lg font-semibold` pattern from existing buttons

### Testing Patterns

Existing test file: `src/services/__tests__/foregroundAudioService.test.ts`

- Native module is mocked via `jest.mock('expo-foreground-audio', ...)` — follow the exact same mock structure
- The `listenersRegistered` singleton flag in `foregroundAudioService.ts` requires `jest.resetModules()` before each test that needs fresh listener registration — pattern already established in the test file
- The "end" action test at line 147 mocks `'../sessionManager'` — update this test to verify `endSessionFromNotification` is called instead of `endSession`

### References

- ForegroundAudioService actions: `modules/expo-foreground-audio/android/src/main/java/expo/modules/foregroundaudio/ForegroundAudioService.kt:16-35`
- Notification build with pause/resume toggle: `ForegroundAudioService.kt:130-176`
- JS event listeners (pause/resume/end): `src/services/foregroundAudioService.ts:57-78`
- sessionManager.endSession() (broken end path): `src/services/sessionManager.ts:311-328`
- sessionManager.onSessionComplete() (correct end path): `src/services/sessionManager.ts:288-306`
- sessionManager.resume(): `src/services/sessionManager.ts:342-347`
- Existing notification update call: `src/services/sessionManager.ts:220-224`
- Session screen active UI: `src/app/(main)/session.tsx:155-232`
- AnkiDroid permission request (broken): `modules/anki-droid/android/src/main/java/expo/modules/ankidroid/AnkiDroidModule.kt:75-90`
- Permission screen: `src/app/(onboarding)/permissions.tsx`
- Epics doc Story 4.2: `_bmad-output/planning-artifacts/epics.md` (lines ~452-468)

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
