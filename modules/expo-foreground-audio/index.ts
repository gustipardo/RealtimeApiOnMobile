import { NativeModule, requireNativeModule } from 'expo-modules-core';

interface ForegroundAudioEvents {
  onAudioFocusChange: { state: 'gain' | 'loss' | 'loss_transient' | 'loss_transient_can_duck' };
  onNotificationAction: { action: 'pause' | 'resume' | 'end' };
  onAudioData: { data: string };
}

interface ExpoForegroundAudioInterface extends NativeModule<ForegroundAudioEvents> {
  startService(title: string, body: string): Promise<void>;
  stopService(): Promise<void>;
  updateNotification(title: string, body: string): Promise<void>;
  // Posts a transient 3-second heads-up notification (WhatsApp-style peek)
  // alongside the persistent foreground-service notification. Used when the
  // app is minimized mid-session so the user sees a quick reminder banner.
  triggerHeadsUp(): Promise<void>;
  isServiceRunning(): boolean;
  requestAudioFocus(): Promise<void>;
  abandonAudioFocus(): Promise<void>;
  // PCM mic capture
  startMicCapture(sampleRate: number): Promise<void>;
  stopMicCapture(): Promise<void>;
  // PCM audio playback
  initAudioPlayer(sampleRate: number): Promise<void>;
  playAudioChunk(base64Data: string): Promise<void>;
  stopAudioPlayer(): Promise<void>;
}

const ExpoForegroundAudioModule =
  requireNativeModule<ExpoForegroundAudioInterface>('ExpoForegroundAudio');

export default ExpoForegroundAudioModule;
