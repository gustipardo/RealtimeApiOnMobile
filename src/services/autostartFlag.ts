// Runtime gate for the dev autostart effect in deck-select.tsx.
//
// Two paths can enable it:
//   1. `AUTO_START_ENABLED=true` in .env (sticky, every launch).
//   2. Launch deep link carries `?autostart=1` (per-launch override). Set
//      by `_layout.tsx` after reading `Linking.getInitialURL()`.
//
// deck-select reads `useAutostartEnabled()` (reactive hook) so the effect
// re-runs if the deep-link override resolves after decks have already loaded.

import { create } from "zustand";
import Constants from "expo-constants";

const useAutostartFlagStore = create<{ runtimeOverride: boolean }>(() => ({
  runtimeOverride: false,
}));

export function setAutostartOverride(value: boolean): void {
  useAutostartFlagStore.setState({ runtimeOverride: value });
}

// Non-reactive read (for non-component callers).
export function isAutostartEnabled(): boolean {
  const { runtimeOverride } = useAutostartFlagStore.getState();
  if (runtimeOverride) return true;
  return (Constants.expoConfig?.extra as any)?.autoStartEnabled === true;
}

// Reactive hook for use inside React components / effects.
export function useAutostartEnabled(): boolean {
  const runtimeOverride = useAutostartFlagStore((s) => s.runtimeOverride);
  const envEnabled =
    (Constants.expoConfig?.extra as any)?.autoStartEnabled === true;
  return runtimeOverride || envEnabled;
}
