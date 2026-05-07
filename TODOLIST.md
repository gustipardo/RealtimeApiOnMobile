# App TODOLIST

Items for the app development agent to implement. Priority order: top = most urgent.

See `MVP_validation_plan.md` Section 13 for full architecture details.

---

## P0 — Required for launch

### 1. Dev/Prod environment config
- [x] Create `src/config/env.ts` with `APP_MODE` detection (`dev` / `production`)
- [x] Export helpers: `isDev()`, `requiresAuth()`, `requiresPayment()`
- [x] In dev mode: skip auth, use `.env` API key directly, no paywall, log analytics to console
- [x] In production mode: require auth, use ephemeral tokens from cloud function, enforce trial/payments
- [x] Update `app.config.js` to support `APP_MODE` env variable

### 2. Firebase setup
- [ ] Create Firebase project (manual: Firebase Console)
- [x] Add Firebase to the Expo/React Native app (`@react-native-firebase/app`)
- [x] Configure Firebase Auth with Google Sign-In provider (code + plugins added)
- [ ] Create Firestore collection `users/{uid}` (auto-created by cloud function on first user)
- [x] Cloud Function `getSessionToken` implemented (`functions/src/index.ts`)
- [ ] Deploy cloud functions (`cd functions && npm install && firebase deploy --only functions`)
- [ ] Add `google-services.json` to project root (download from Firebase Console)

**Cloud Function `getSessionToken`:**
```
Input: Firebase auth token (verified automatically by callable function)
Logic:
  1. Get user doc from Firestore
  2. If new user → create doc, set trialStart = now, sessionCount = 0
  3. Check: is trial active (< 7 days AND < 10 sessions) OR subscription active?
  4. If no → return { error: "trial_expired" }
  5. If yes → POST https://api.openai.com/v1/realtime/client_secrets   ← GA endpoint
              Authorization: Bearer {SERVER_OPENAI_KEY}
              Body: { session: { type: "realtime", model: "gpt-4o-realtime-preview-2024-12-17" } }
  6. Increment sessionCount in Firestore
  7. Return { token: response.value }   ← token starts with "ek_"
```

**NOTE — API endpoint evolution:**
The app currently uses Beta endpoints. Update to GA:
| Purpose | Beta (current app) | GA (use this) |
|---------|-------------------|---------------|
| Ephemeral token | `POST /v1/realtime/sessions` | `POST /v1/realtime/client_secrets` |
| SDP exchange | `POST /v1/realtime?model={model}` | `POST /v1/realtime/calls` |

### 3. Authentication (production mode)
- [x] Add `@react-native-firebase/auth` + Google Sign-In
- [x] Create sign-in screen (`src/app/(onboarding)/sign-in.tsx`)
- [x] Update onboarding flow: if `requiresAuth()`, show sign-in; otherwise skip to api-key
- [x] Add sign-out option in deck-select header

### 4. Update WebRTC connection for ephemeral tokens
- [x] Create `src/services/tokenService.ts`
- [x] Modify `webrtcManager.ts`: uses tokenService, GA endpoint in prod, Beta in dev
- [x] Handle `trial_expired` response → redirect to paywall screen

### 5. Free trial system
- [x] On app open (prod mode), call cloud function to check trial status
- [x] If trial active: show remaining days/sessions in deck-select header banner
- [x] If trial expired and no subscription: redirect to paywall, block session start

### 6. Google Play Billing (subscription)
- [x] Integrate `react-native-iap` (`billingService.ts`)
- [ ] Create subscription products on Google Play Console ($4.99/mo, $39.99/yr)
- [x] Build paywall/subscription screen (`src/app/(main)/paywall.tsx`)
- [x] On subscription purchase: update `subscriptionStatus` in Firestore (via `verifyPurchase` cloud function)
- [ ] Cloud Function: proper Google Play Developer API verification (TODO in `verifyPurchase`)

### 7. Analytics
- [x] Integrate PostHog React Native SDK (`src/services/analytics.ts`)
- [x] Implement event tracking with typed helpers (`AnalyticsEvents`)
- [x] Events wired: `app_opened`, `signup_started/completed`, `deck_selected`, `session_started/completed/error/reconnected`, `paywall_shown`, `subscription_started/cancelled`
- [ ] Wire remaining events: `onboarding_ankidroid_check`, `onboarding_permissions_granted`, `onboarding_completed`, `trial_started/expired`, `session_first_card_answered`, `settings_changed`
- [x] In dev mode: log events to console only (no network calls)
- [x] In production mode: send events to PostHog
- [ ] Replace `YOUR_POSTHOG_API_KEY` and `YOUR_POSTHOG_HOST` in `_layout.tsx` with actual values

---

## P1 — Important but not blocking launch

### In-app feedback
- [ ] After the 3rd completed session, show a simple feedback prompt
- [ ] "How was your study session?" — 1-5 stars + optional text field
- [ ] Show once per week max, non-intrusive
- [ ] Send feedback to PostHog as event

### Play Store listing preparation
- [ ] Update app name from "RealtimeApiOnMobile" to "Anki Conversacionales"
- [ ] Update `app.json`: name, slug, package name (`com.ankiconversacionales.app`)
- [ ] Create Play Store screenshots
- [ ] Write Play Store description (bilingual EN/ES)
- [ ] Create app icon and feature graphic

---

## P2 — Post-launch improvements

### Session history
- [ ] Store session results locally (date, deck, cards reviewed, accuracy)
- [ ] Show session history screen with trends

### Study reminders
- [ ] Push notification reminders for daily study (Firebase Cloud Messaging)
- [ ] Configurable time in settings

---

## Recently shipped (2026-05-06 evening session)

### Multi-card sessions (was: every session was 1 card long)
- [x] Hybrid `getDueCards` in `AnkiDroidModule.kt`: schedule URI for the head card (correct `ord` for write-back) + `notes/?deckID=` URI for padding, deduped by noteId, capped at deck due-count.
- [x] `getDeckDueCount(deckName)` helper.
- [x] Test file `App/src/services/__tests__/sessionManager.start.test.ts`.
- [x] VERIFIED on emulator (Aws Exam SA, 168 cards loaded).

### Phone-call-style in-session notification
- [x] Added POST_NOTIFICATIONS to runtime permission flow (`App/src/app/(onboarding)/permissions.tsx`).
- [x] New notification channel `voice_session_v2` at `IMPORTANCE_HIGH` with `CATEGORY_CALL`, gold accent (`#E4A13F`).
- [x] `▶` (`ic_media_play`) icon as the running indicator (rejected CallStyle's forced timer).
- [x] Single-notification peek/revert mechanism: JS `AppState` listener triggers Kotlin `ACTION_HEADS_UP` → cancel + notify with "Tap to return…" body → `Handler.postDelayed` reverts to "Card N of M" after 3s.
- [x] `startForegroundService` moved BEFORE `sendFirstCard` in `startSession` (was previously gated on AI's first reply, never ran when WebSocket dropped). Defensive fallback added to `resumeAfterReconnect`.
- [ ] User visual sign-off on the final design + verification that heads-up re-fires on second/third minimize per session.

### Known unfixed (out of scope for this session)
- [ ] `App/src/native/__tests__/ankiBridge.test.ts` and `App/src/test-harness/__tests__/replay.test.ts` use the old 2-arg `answerCard(noteId, pass)` signature; need updating to the current 5-arg signature (8 failing tests).
- [ ] `answerCard` write-back from earlier in this session day (column-name fix: `ord`/`answer_ease`) still UNVERIFIED end-to-end — sessions kept dropping the WebSocket before user could grade a card on the emulator.
