import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, Linking, AppState, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { PermissionsAndroid } from 'react-native';
import { ankiBridge } from '../../native/ankiBridge';

type PermissionStatus = 'pending' | 'granted' | 'denied';

interface PermissionState {
  ankidroid: PermissionStatus;
  microphone: PermissionStatus;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const [permissions, setPermissions] = useState<PermissionState>({
    ankidroid: 'pending',
    microphone: 'pending',
  });
  const [isRequesting, setIsRequesting] = useState(false);

  // Check permissions on mount and when app returns to foreground
  const checkPermissions = useCallback(async () => {
    const [hasAnkiPermission, hasMicPermission] = await Promise.all([
      ankiBridge.hasApiPermission(),
      checkMicrophonePermission(),
    ]);

    setPermissions({
      ankidroid: hasAnkiPermission ? 'granted' : 'pending',
      microphone: hasMicPermission ? 'granted' : 'pending',
    });
  }, []);

  useEffect(() => {
    checkPermissions();

    // Re-check when app comes back to foreground (after permission dialogs)
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkPermissions();
      }
    });

    return () => subscription.remove();
  }, [checkPermissions]);

  async function checkMicrophonePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
    );
    return result;
  }

  async function requestMicrophonePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      {
        title: 'Microphone Permission',
        message:
          'This app needs access to your microphone for voice study sessions with the AI tutor.',
        buttonPositive: 'Grant',
        buttonNegative: 'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }

  async function handleRequestAnkiDroidPermission() {
    setIsRequesting(true);
    try {
      await ankiBridge.requestApiPermission();
      // Permission dialog opens in AnkiDroid - user will return to app
      // AppState listener will re-check permissions when app becomes active
    } catch (error) {
      console.error('Failed to request AnkiDroid permission:', error);
      setPermissions((prev) => ({ ...prev, ankidroid: 'denied' }));
    }
    setIsRequesting(false);
  }

  async function handleRequestMicrophonePermission() {
    setIsRequesting(true);
    const granted = await requestMicrophonePermission();
    setPermissions((prev) => ({
      ...prev,
      microphone: granted ? 'granted' : 'denied',
    }));
    setIsRequesting(false);
  }

  function handleOpenSettings() {
    Linking.openSettings();
  }

  function handleContinue() {
    router.push('/(onboarding)/api-key');
  }

  const allGranted =
    permissions.ankidroid === 'granted' && permissions.microphone === 'granted';

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="mb-2 text-center text-2xl font-bold text-gray-900">
        Permissions Required
      </Text>

      <Text className="mb-8 text-center text-base text-gray-600">
        We need a few permissions to enable voice study sessions.
      </Text>

      {/* AnkiDroid Permission */}
      <View className="mb-4 rounded-xl border-2 border-gray-200 p-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900">
            AnkiDroid Access
          </Text>
          <PermissionBadge status={permissions.ankidroid} />
        </View>

        <Text className="mb-3 text-sm text-gray-600">
          Allows this app to read your flashcard decks and due cards from
          AnkiDroid.
        </Text>

        {permissions.ankidroid === 'pending' && (
          <Pressable
            onPress={handleRequestAnkiDroidPermission}
            disabled={isRequesting}
            className="rounded-lg bg-blue-500 px-4 py-3 active:bg-blue-600 disabled:opacity-50"
          >
            <Text className="text-center font-semibold text-white">
              Grant AnkiDroid Access
            </Text>
          </Pressable>
        )}

        {permissions.ankidroid === 'denied' && (
          <View>
            <Text className="mb-2 text-sm text-red-600">
              Permission denied. Please grant access in AnkiDroid settings.
            </Text>
            <Pressable
              onPress={handleRequestAnkiDroidPermission}
              className="rounded-lg border-2 border-blue-500 px-4 py-3 active:bg-blue-50"
            >
              <Text className="text-center font-semibold text-blue-500">
                Try Again
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Microphone Permission */}
      <View className="mb-8 rounded-xl border-2 border-gray-200 p-4">
        <View className="mb-2 flex-row items-center justify-between">
          <Text className="text-lg font-semibold text-gray-900">
            Microphone
          </Text>
          <PermissionBadge status={permissions.microphone} />
        </View>

        <Text className="mb-3 text-sm text-gray-600">
          Required for voice conversations with the AI tutor during study
          sessions.
        </Text>

        {permissions.microphone === 'pending' && (
          <Pressable
            onPress={handleRequestMicrophonePermission}
            disabled={isRequesting}
            className="rounded-lg bg-blue-500 px-4 py-3 active:bg-blue-600 disabled:opacity-50"
          >
            <Text className="text-center font-semibold text-white">
              Grant Microphone Access
            </Text>
          </Pressable>
        )}

        {permissions.microphone === 'denied' && (
          <View>
            <Text className="mb-2 text-sm text-red-600">
              Microphone access is required. Please enable it in Settings.
            </Text>
            <Pressable
              onPress={handleOpenSettings}
              className="rounded-lg border-2 border-blue-500 px-4 py-3 active:bg-blue-50"
            >
              <Text className="text-center font-semibold text-blue-500">
                Open Settings
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Continue Button */}
      <Pressable
        onPress={handleContinue}
        disabled={!allGranted}
        className={`rounded-xl px-6 py-4 ${
          allGranted
            ? 'bg-blue-500 active:bg-blue-600'
            : 'bg-gray-300'
        }`}
      >
        <Text
          className={`text-center text-lg font-semibold ${
            allGranted ? 'text-white' : 'text-gray-500'
          }`}
        >
          {allGranted ? 'Continue' : 'Grant All Permissions to Continue'}
        </Text>
      </Pressable>
    </View>
  );
}

function PermissionBadge({ status }: { status: PermissionStatus }) {
  if (status === 'granted') {
    return (
      <View className="rounded-full bg-green-100 px-3 py-1">
        <Text className="text-sm font-medium text-green-700">Granted</Text>
      </View>
    );
  }
  if (status === 'denied') {
    return (
      <View className="rounded-full bg-red-100 px-3 py-1">
        <Text className="text-sm font-medium text-red-700">Denied</Text>
      </View>
    );
  }
  return (
    <View className="rounded-full bg-gray-100 px-3 py-1">
      <Text className="text-sm font-medium text-gray-600">Pending</Text>
    </View>
  );
}
