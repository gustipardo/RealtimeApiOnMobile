# Maestro flows (Layer 6 UI)

Real-device / emulator UI flows driving the actual Engram APK. See
`../TESTING.md` for where this sits in the 6-layer strategy.

## Flows

| File                          | Covers                                                                                                                                                      | Run                            |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `session-deck-isolation.yaml` | Deck selection → session → correct card per index (SCAFFOLD; uses a placeholder appId — needs the real `com.anonymous.RealtimeApiOnMobile` before running). | `npm run test:maestro`         |
| `account-settings.yaml`       | Avatar entry → Account screen render → dev-mode gating → live Dark toggle → back-nav. 4 labeled screenshots to `_debug/screenshots/`.                       | `npm run test:maestro:account` |

`subflows/dismiss-onboarding.yaml` — reusable onboarding skip (also placeholder appId).

## Prereqs

1. Engram **dev client** installed and **Metro running** (`npm start`), with
   `adb reverse tcp:8081 tcp:8081`. (Or a release/standalone build installed.)
2. Device past onboarding: AnkiDroid granted + decks loaded. The flows guard
   the onboarding screens but assume setup is done.
3. One device/emulator attached (`adb devices`). Maestro auto-selects it.

## appId

Use the **real** application id: `com.anonymous.RealtimeApiOnMobile`.
`account-settings.yaml` already does. The older `session-deck-isolation.yaml`
and `subflows/dismiss-onboarding.yaml` still carry the placeholder
`com.realtimeapionmobile` from before — fix those before relying on them.

## Selectors

The Account flow targets stable hooks added for testability:

- `account-button` (testID) — the avatar on deck-select.
- `toggle-dark`, `toggle-readback` (testIDs) — the Switches (no visible text).
- `"Back"` (accessibilityLabel) — the settings back chevron.
- Visible text anchors: `"Sync"`, `"Account"`, `"Developer access"`, etc.

## Gate-mode note

`account-settings.yaml` asserts `"Developer access"` and that Restore / Sign out
are **absent** — correct for the DEFAULT dev-bypass build. For a real-auth /
real-payment build, swap that assertion for the expected plan label
(Free trial / Trial ended / Engram Pro) and expect Restore / Sign out present.
