import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { signInWithGoogle } from '../../services/authService';
import { AnalyticsEvents } from '../../services/analytics';

export default function SignInScreen() {
  const router = useRouter();
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setError(null);
    AnalyticsEvents.signupStarted();

    try {
      const user = await signInWithGoogle();
      AnalyticsEvents.signupCompleted('google');
      setOnboardingCompleted(true);
      router.replace('/(main)/deck-select');
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setError(err.message || 'Sign-in failed. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-white px-6">
      <View className="mb-8 items-center">
        <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-blue-100">
          <Text className="text-5xl">🎙</Text>
        </View>

        <Text className="mb-2 text-center text-2xl font-bold text-gray-900">
          Anki Conversacionales
        </Text>

        <Text className="mb-2 text-center text-base text-gray-600">
          Study your Anki flashcards with an AI voice tutor
        </Text>

        <Text className="text-center text-sm text-gray-400">
          Sign in to start your 7-day free trial
        </Text>
      </View>

      {error && (
        <View className="mb-4 w-full rounded-lg bg-red-50 p-3">
          <Text className="text-center text-sm text-red-700">{error}</Text>
        </View>
      )}

      <Pressable
        onPress={handleGoogleSignIn}
        disabled={isSigningIn}
        className={`w-full flex-row items-center justify-center rounded-xl px-6 py-4 ${
          isSigningIn ? 'bg-gray-300' : 'bg-blue-500 active:bg-blue-600'
        }`}
      >
        {isSigningIn ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text className="text-center text-lg font-semibold text-white">
            Sign in with Google
          </Text>
        )}
      </Pressable>
    </View>
  );
}
