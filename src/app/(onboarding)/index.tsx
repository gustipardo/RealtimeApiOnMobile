import { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ankiBridge } from '../../native/ankiBridge';

const ANKIDROID_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.ichi2.anki';

type DetectionState = 'checking' | 'installed' | 'not-installed';

export default function AnkiDroidDetectionScreen() {
  const router = useRouter();
  const [detectionState, setDetectionState] = useState<DetectionState>('checking');

  useEffect(() => {
    checkAnkiDroidInstallation();
  }, []);

  async function checkAnkiDroidInstallation() {
    setDetectionState('checking');
    const isInstalled = await ankiBridge.isInstalled();
    setDetectionState(isInstalled ? 'installed' : 'not-installed');
  }

  function handleContinue() {
    router.push('/(onboarding)/permissions');
  }

  function handleOpenPlayStore() {
    Linking.openURL(ANKIDROID_PLAY_STORE_URL);
  }

  if (detectionState === 'checking') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-lg text-gray-600">
          Checking for AnkiDroid...
        </Text>
      </View>
    );
  }

  if (detectionState === 'installed') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <View className="mb-8 h-24 w-24 items-center justify-center rounded-full bg-green-100">
          <Text className="text-5xl">✓</Text>
        </View>

        <Text className="mb-2 text-center text-2xl font-bold text-gray-900">
          AnkiDroid Detected
        </Text>

        <Text className="mb-8 text-center text-base text-gray-600">
          Great! AnkiDroid is installed on your device. Let's set up the
          connection so you can study your cards with voice.
        </Text>

        <Pressable
          onPress={handleContinue}
          className="w-full rounded-xl bg-blue-500 px-6 py-4 active:bg-blue-600"
        >
          <Text className="text-center text-lg font-semibold text-white">
            Continue
          </Text>
        </Pressable>
      </View>
    );
  }

  // not-installed state
  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="mb-8 h-24 w-24 items-center justify-center rounded-full bg-amber-100">
        <Text className="text-5xl">📚</Text>
      </View>

      <Text className="mb-2 text-center text-2xl font-bold text-gray-900">
        AnkiDroid Required
      </Text>

      <Text className="mb-4 text-center text-base text-gray-600">
        This app works with AnkiDroid to help you study your flashcards using
        voice conversations with an AI tutor.
      </Text>

      <Text className="mb-8 text-center text-base text-gray-600">
        Please install AnkiDroid from the Play Store, then return here to
        continue setup.
      </Text>

      <Pressable
        onPress={handleOpenPlayStore}
        className="mb-4 w-full rounded-xl bg-blue-500 px-6 py-4 active:bg-blue-600"
      >
        <Text className="text-center text-lg font-semibold text-white">
          Install AnkiDroid
        </Text>
      </Pressable>

      <Pressable
        onPress={checkAnkiDroidInstallation}
        className="w-full rounded-xl border-2 border-gray-300 px-6 py-4 active:bg-gray-100"
      >
        <Text className="text-center text-lg font-semibold text-gray-700">
          I've Installed It
        </Text>
      </Pressable>
    </View>
  );
}
