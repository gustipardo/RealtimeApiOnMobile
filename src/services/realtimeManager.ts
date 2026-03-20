/**
 * Proxy that delegates to the active AI provider (OpenAI or Gemini).
 * The provider is chosen via useSettingsStore.aiProvider before session start.
 */
import { webrtcManager } from './webrtcManager';
import { geminiManager } from './geminiManager';
import { useSettingsStore } from '../stores/useSettingsStore';

export type AIProvider = 'openai' | 'gemini';

let activeManager: typeof webrtcManager | typeof geminiManager = webrtcManager;

/**
 * Call before starting a session to pick the right backend.
 * Reads from the persisted setting.
 */
export function syncActiveProvider(): void {
  const provider = useSettingsStore.getState().aiProvider;
  activeManager = provider === 'gemini' ? geminiManager : webrtcManager;
  console.log(`[RealtimeManager] Active provider: ${provider}`);
}

/**
 * Proxy object — every property access/method call is forwarded to
 * whichever manager is currently active.
 */
export const realtimeManager = new Proxy({} as typeof webrtcManager, {
  get(_target, prop, _receiver) {
    const value = (activeManager as any)[prop];
    if (typeof value === 'function') {
      return value.bind(activeManager);
    }
    return value;
  },
  set(_target, prop, value) {
    (activeManager as any)[prop] = value;
    return true;
  },
});
