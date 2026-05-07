import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, Linking, AppState, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { PermissionsAndroid } from 'react-native';
import { ankiBridge } from '../../native/ankiBridge';
import { requiresAuth } from '../../config/env';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { dark as t } from '../../theme/colors';

type PermissionStatus = 'pending' | 'granted' | 'denied';

interface PermissionState {
  ankidroid: PermissionStatus;
  microphone: PermissionStatus;
  notifications: PermissionStatus;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const [permissions, setPermissions] = useState<PermissionState>({
    ankidroid: 'pending',
    microphone: 'pending',
    notifications: 'pending',
  });
  const [isRequesting, setIsRequesting] = useState(false);

  const checkPermissions = useCallback(async () => {
    const t0 = Date.now();
    const [hasAnkiPermission, hasMicPermission, hasNotifPermission] = await Promise.all([
      ankiBridge.hasApiPermission(),
      checkMicrophonePermission(),
      checkNotificationsPermission(),
    ]);
    console.log(`[permissions] checkPermissions took ${Date.now() - t0}ms → anki=${hasAnkiPermission} mic=${hasMicPermission} notif=${hasNotifPermission}`);

    setPermissions({
      ankidroid: hasAnkiPermission ? 'granted' : 'pending',
      microphone: hasMicPermission ? 'granted' : 'pending',
      notifications: hasNotifPermission ? 'granted' : 'pending',
    });
  }, []);

  useEffect(() => {
    checkPermissions();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });

    return () => subscription.remove();
  }, [checkPermissions]);

  async function checkMicrophonePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  }

  async function requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message: 'Engram needs access to your microphone for voice study sessions with the AI tutor.',
        buttonPositive: 'Grant',
        buttonNegative: 'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  // Android 13+ requires runtime POST_NOTIFICATIONS for the foreground-service
  // notification to actually appear when the app is backgrounded. Without it,
  // the service runs but the persistent banner is invisible — user perceives
  // "the app doesn't keep me informed when minimized." Pre-13 returns granted.
  async function checkNotificationsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version < 33) return true;
    return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }

  async function requestNotificationsPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version < 33) return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      {
        title: 'Notifications',
        message: 'Engram shows a phone-call-style banner during a study session so you can pause or end it from anywhere.',
        buttonPositive: 'Grant',
        buttonNegative: 'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  async function handleRequestAnkiDroidPermission() {
    setIsRequesting(true);
    const t0 = Date.now();
    try {
      const result = await PermissionsAndroid.request(
        'com.ichi2.anki.permission.READ_WRITE_DATABASE' as any,
        {
          title: 'AnkiDroid Access',
          message: 'Engram needs access to your AnkiDroid flashcard decks and due cards.',
          buttonPositive: 'Grant',
          buttonNegative: 'Deny',
        }
      );
      console.log(`[permissions] AnkiDroid request resolved in ${Date.now() - t0}ms → ${result}`);
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      setPermissions((prev) => ({ ...prev, ankidroid: granted ? 'granted' : 'denied' }));
    } catch (err) {
      console.warn(`[permissions] AnkiDroid request threw after ${Date.now() - t0}ms`, err);
      setPermissions((prev) => ({ ...prev, ankidroid: 'denied' }));
    }
    setIsRequesting(false);
  }

  async function handleRequestMicrophonePermission() {
    setIsRequesting(true);
    const t0 = Date.now();
    const granted = await requestMicrophonePermission();
    console.log(`[permissions] Microphone request resolved in ${Date.now() - t0}ms → granted=${granted}`);
    setPermissions((prev) => ({
      ...prev,
      microphone: granted ? 'granted' : 'denied',
    }));
    setIsRequesting(false);
  }

  async function handleRequestNotificationsPermission() {
    setIsRequesting(true);
    const t0 = Date.now();
    const granted = await requestNotificationsPermission();
    console.log(`[permissions] Notifications request resolved in ${Date.now() - t0}ms → granted=${granted}`);
    setPermissions((prev) => ({
      ...prev,
      notifications: granted ? 'granted' : 'denied',
    }));
    setIsRequesting(false);
  }

  function handleOpenSettings() {
    Linking.openSettings();
  }

  function handleContinue() {
    if (requiresAuth()) {
      router.push('/(onboarding)/sign-in');
    } else {
      useSettingsStore.getState().setOnboardingCompleted(true);
      router.replace('/(main)/deck-select');
    }
  }

  const allGranted =
    permissions.ankidroid === 'granted' &&
    permissions.microphone === 'granted' &&
    permissions.notifications === 'granted';

  return (
    <View style={{ flex: 1, backgroundColor: t.bg.base, paddingHorizontal: 24, paddingTop: 64 }}>
      <Text style={{ marginBottom: 8, textAlign: 'center', fontSize: 26, fontWeight: '700', color: t.text.primary, letterSpacing: -0.4 }}>
        Permissions Required
      </Text>

      <Text style={{ marginBottom: 32, textAlign: 'center', fontSize: 15, color: t.text.secondary, lineHeight: 22 }}>
        Engram needs a couple of permissions to enable voice study sessions.
      </Text>

      <PermissionCard
        title="AnkiDroid Access"
        description="Lets Engram read your flashcard decks and due cards from AnkiDroid."
        status={permissions.ankidroid}
        onRequest={handleRequestAnkiDroidPermission}
        deniedHint="Permission denied. Grant access from AnkiDroid settings."
        disabled={isRequesting}
      />

      <PermissionCard
        title="Microphone"
        description="Required for voice conversations with the AI tutor during study sessions."
        status={permissions.microphone}
        onRequest={handleRequestMicrophonePermission}
        onOpenSettings={handleOpenSettings}
        deniedHint="Microphone access is required. Enable it in Settings."
        disabled={isRequesting}
      />

      <PermissionCard
        title="Notifications"
        description="Shows a phone-call-style banner during a study session so you can pause or end it from anywhere."
        status={permissions.notifications}
        onRequest={handleRequestNotificationsPermission}
        onOpenSettings={handleOpenSettings}
        deniedHint="Notifications are required for the in-session banner. Enable them in Settings."
        disabled={isRequesting}
      />

      <Pressable
        onPress={handleContinue}
        disabled={!allGranted}
        style={({ pressed }) => ({
          marginTop: 8,
          borderRadius: 12,
          paddingHorizontal: 24,
          paddingVertical: 16,
          backgroundColor: !allGranted
            ? t.bg.surface3
            : pressed
            ? t.accent.pressed
            : t.accent.default,
        })}
      >
        <Text
          style={{
            textAlign: 'center',
            fontSize: 16,
            fontWeight: '700',
            color: allGranted ? t.text.onAccent : t.text.disabled,
          }}
        >
          {allGranted ? 'Continue' : 'Grant All Permissions to Continue'}
        </Text>
      </Pressable>
    </View>
  );
}

function PermissionCard({
  title,
  description,
  status,
  onRequest,
  onOpenSettings,
  deniedHint,
  disabled,
}: {
  title: string;
  description: string;
  status: PermissionStatus;
  onRequest: () => void;
  onOpenSettings?: () => void;
  deniedHint: string;
  disabled?: boolean;
}) {
  return (
    <View
      style={{
        marginBottom: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.border.subtle,
        backgroundColor: t.bg.surface1,
        padding: 16,
      }}
    >
      <View style={{ marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: t.text.primary }}>{title}</Text>
        <PermissionBadge status={status} />
      </View>

      <Text style={{ marginBottom: 12, fontSize: 13, color: t.text.secondary, lineHeight: 19 }}>{description}</Text>

      {status === 'pending' && (
        <Pressable
          onPress={onRequest}
          disabled={disabled}
          style={({ pressed }) => ({
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            opacity: disabled ? 0.5 : 1,
            backgroundColor: pressed ? t.accent.pressed : t.accent.default,
          })}
        >
          <Text style={{ textAlign: 'center', fontWeight: '700', color: t.text.onAccent }}>Grant {title}</Text>
        </Pressable>
      )}

      {status === 'denied' && (
        <View>
          <Text style={{ marginBottom: 8, fontSize: 13, color: t.error.text }}>{deniedHint}</Text>
          <Pressable
            onPress={onOpenSettings ?? onRequest}
            style={({ pressed }) => ({
              borderRadius: 10,
              borderWidth: 1,
              borderColor: t.accent.default,
              paddingHorizontal: 16,
              paddingVertical: 12,
              backgroundColor: pressed ? t.accent.subtleBg : 'transparent',
            })}
          >
            <Text style={{ textAlign: 'center', fontWeight: '700', color: t.accent.default }}>
              {onOpenSettings ? 'Open Settings' : 'Try Again'}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function PermissionBadge({ status }: { status: PermissionStatus }) {
  const cfg =
    status === 'granted'
      ? { bg: t.success.subtleBg, color: t.success.text, label: 'Granted' }
      : status === 'denied'
      ? { bg: t.error.subtleBg, color: t.error.text, label: 'Denied' }
      : { bg: t.bg.surface3, color: t.text.tertiary, label: 'Pending' };

  return (
    <View style={{ borderRadius: 9999, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: cfg.bg }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: cfg.color }}>{cfg.label}</Text>
    </View>
  );
}
