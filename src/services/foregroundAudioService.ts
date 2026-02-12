import ExpoForegroundAudioModule from 'expo-foreground-audio';
import { useSessionStore } from '../stores/useSessionStore';
import { webrtcManager } from './webrtcManager';

/**
 * Foreground Audio Service - JS wrapper for the native module.
 * Manages the Android Foreground Service that keeps WebRTC audio alive
 * when the app is backgrounded or screen is locked.
 *
 * This is the ONLY file that imports from the native module.
 * All other files interact through this wrapper.
 */

let listenersRegistered = false;

/**
 * Start the foreground service with a notification.
 * Call when session enters 'asking_question' phase.
 */
export async function startForegroundService(title: string, body: string): Promise<void> {
  registerListeners();
  await ExpoForegroundAudioModule.startService(title, body);
}

/**
 * Stop the foreground service.
 * Call on session_complete or error.
 */
export async function stopForegroundService(): Promise<void> {
  await ExpoForegroundAudioModule.stopService();
}

/**
 * Update the notification content (e.g., card progress).
 */
export async function updateForegroundNotification(title: string, body: string): Promise<void> {
  if (ExpoForegroundAudioModule.isServiceRunning()) {
    await ExpoForegroundAudioModule.updateNotification(title, body);
  }
}

/**
 * Check if the foreground service is currently running.
 */
export function isServiceRunning(): boolean {
  return ExpoForegroundAudioModule.isServiceRunning();
}

/**
 * Register event listeners for notification actions and audio focus changes.
 * Only registers once — subsequent calls are no-ops.
 */
function registerListeners(): void {
  if (listenersRegistered) return;
  listenersRegistered = true;

  // Handle notification bar button presses
  ExpoForegroundAudioModule.addListener('onNotificationAction', (event) => {
    const { transitionTo } = useSessionStore.getState();

    switch (event.action) {
      case 'pause':
        webrtcManager.setMicrophoneMuted(true);
        transitionTo('paused', 'notification_pause');
        break;

      case 'resume':
        webrtcManager.setMicrophoneMuted(false);
        transitionTo('asking_question', 'notification_resume');
        break;

      case 'end':
        // Import sessionManager lazily to avoid circular dependency
        const { sessionManager } = require('./sessionManager');
        sessionManager.endSession();
        break;
    }
  });

  // Handle audio focus changes (phone calls, other audio apps)
  ExpoForegroundAudioModule.addListener('onAudioFocusChange', (event) => {
    const { transitionTo, phase } = useSessionStore.getState();

    switch (event.state) {
      case 'loss_transient':
        // Phone call or alarm — mute mic, keep WebRTC connection alive
        webrtcManager.setMicrophoneMuted(true);
        if (phase !== 'paused') {
          transitionTo('paused', 'audio_focus_loss_transient');
        }
        break;

      case 'gain':
        // Regained focus — unmute mic, resume if was paused by focus loss
        webrtcManager.setMicrophoneMuted(false);
        if (phase === 'paused') {
          transitionTo('asking_question', 'audio_focus_gain');
        }
        break;

      case 'loss':
        // Permanent loss — pause session, do NOT auto-resume
        webrtcManager.setMicrophoneMuted(true);
        if (phase !== 'paused' && phase !== 'idle' && phase !== 'session_complete') {
          transitionTo('paused', 'audio_focus_loss');
        }
        break;

      case 'loss_transient_can_duck':
        // Can lower volume — for voice communication we still pause
        webrtcManager.setMicrophoneMuted(true);
        if (phase !== 'paused') {
          transitionTo('paused', 'audio_focus_duck');
        }
        break;
    }
  });
}
