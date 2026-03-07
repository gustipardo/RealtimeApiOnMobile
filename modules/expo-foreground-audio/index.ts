import { NativeModule, requireNativeModule } from 'expo-modules-core';

interface ForegroundAudioEvents {
  onAudioFocusChange: { state: 'gain' | 'loss' | 'loss_transient' | 'loss_transient_can_duck' };
  onNotificationAction: { action: 'pause' | 'resume' | 'end' };
}

interface ExpoForegroundAudioInterface extends NativeModule<ForegroundAudioEvents> {
  startService(title: string, body: string): Promise<void>;
  stopService(): Promise<void>;
  updateNotification(title: string, body: string): Promise<void>;
  isServiceRunning(): boolean;
  requestAudioFocus(): Promise<void>;
  abandonAudioFocus(): Promise<void>;
}

const ExpoForegroundAudioModule =
  requireNativeModule<ExpoForegroundAudioInterface>('ExpoForegroundAudio');

export default ExpoForegroundAudioModule;
