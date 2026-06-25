import Constants from "expo-constants";

export type AppMode = "dev" | "production" | "test";

/**
 * Determine the current app mode.
 * Priority: APP_MODE env variable > __DEV__ global.
 *
 * `test` mode enables the audio-injection harness: mic capture is
 * routed through `fakeMicSource` so a pre-recorded PCM clip can stand
 * in for a live microphone. Output (AI speech) still plays normally,
 * and the rest of the app behaves like dev.
 */
export function getAppMode(): AppMode {
  const envMode = Constants.expoConfig?.extra?.appMode;
  if (envMode === "production" || envMode === "dev" || envMode === "test") {
    return envMode;
  }
  return __DEV__ ? "dev" : "production";
}

export function isDev(): boolean {
  return getAppMode() === "dev";
}

export function isProd(): boolean {
  return getAppMode() === "production";
}

export function isTestMode(): boolean {
  return getAppMode() === "test";
}

// ---------------------------------------------------------------------------
// Gate flags (auth / payment) + dev bypass
//
// Best practice: bypasses are env-driven and funnelled through this single
// module — never scattered `if (__DEV__)` in screens. Two layers:
//   1. A hard `__DEV__` guard so a *release* binary can NEVER bypass a gate,
//      regardless of a stray APP_MODE/override baked into `extra`. The unsafe
//      state is unrepresentable in production.
//   2. In a dev binary: gates are OFF by default (jump straight to the study
//      core), and can be forced ON per-gate via AUTH_REQUIRED / PAYMENT_REQUIRED
//      to develop/test the real auth or paywall flow.
// ---------------------------------------------------------------------------

/** Read a boolean dev-override from expo-config `extra` (set in app.config.js). */
function devFlag(name: "authRequired" | "paymentRequired"): boolean {
  return Constants.expoConfig?.extra?.[name] === true;
}

/**
 * True when Firebase Auth sign-in is enforced.
 * - Release binary (`__DEV__ === false`): ALWAYS true — bypass can't ship.
 * - Dev binary: true in explicit `production` mode or when AUTH_REQUIRED=true;
 *   otherwise bypassed (a fake dev user is used — see authService).
 */
export function requiresAuth(): boolean {
  if (!__DEV__) return true;
  if (isProd()) return true;
  return devFlag("authRequired");
}

/**
 * True when trial/subscription checks are enforced.
 * Same two-layer guard as requiresAuth (release always true; dev opt-in via
 * PAYMENT_REQUIRED=true). When bypassed, a fully-unlocked status / fake
 * purchase is used — see trialService / billingService.
 */
export function requiresPayment(): boolean {
  if (!__DEV__) return true;
  if (isProd()) return true;
  return devFlag("paymentRequired");
}

/** True when the auth gate is being bypassed in this (dev) binary. */
export function authBypassed(): boolean {
  return !requiresAuth();
}

/** True when the payment gate is being bypassed in this (dev) binary. */
export function paymentBypassed(): boolean {
  return !requiresPayment();
}

/**
 * Loudly warn when any gate is bypassed, so a bypassed run is never mistaken
 * for a real one. Call once at startup. No-op when nothing is bypassed (e.g.
 * any release build, where bypass is impossible).
 */
export function logBypassStatus(): void {
  const bypassed: string[] = [];
  if (authBypassed()) bypassed.push("AUTH");
  if (paymentBypassed()) bypassed.push("PAYMENT");
  if (bypassed.length > 0) {
    console.warn(
      `[env] ⚠ DEV BYPASS ACTIVE: ${bypassed.join(" + ")} gate(s) bypassed ` +
        `(mode=${getAppMode()}). A fake user/subscription is in use. ` +
        `This is impossible in a release build.`,
    );
  }
}
