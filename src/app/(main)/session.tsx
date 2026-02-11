import { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useConnectionStore } from '../../stores/useConnectionStore';
import { useSessionStore } from '../../stores/useSessionStore';
import { useCardCacheStore } from '../../stores/useCardCacheStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { sessionManager } from '../../services/sessionManager';
import { CardDisplay } from '../../components/CardDisplay';

export default function SessionScreen() {
  const router = useRouter();
  const connectionState = useConnectionStore((s) => s.connectionState);
  const sessionPhase = useSessionStore((s) => s.phase);
  const stats = useSessionStore((s) => s.stats);
  const selectedDeck = useSettingsStore((s) => s.selectedDeck);
  const currentCard = useCardCacheStore((s) => s.getCurrentCard());
  const cards = useCardCacheStore((s) => s.cards);
  const currentIndex = useCardCacheStore((s) => s.currentIndex);

  const [error, setError] = useState<string | null>(null);

  const handleStartSession = useCallback(async () => {
    try {
      setError(null);
      await sessionManager.startSession();
    } catch (err: any) {
      setError(err.message || 'Failed to start session');
    }
  }, []);

  const handleEndSession = useCallback(() => {
    sessionManager.endSession();
    router.back();
  }, [router]);

  const handleRetry = useCallback(() => {
    setError(null);
    handleStartSession();
  }, [handleStartSession]);

  // Auto-start session on mount
  useEffect(() => {
    if (sessionPhase === 'idle') {
      handleStartSession();
    }

    return () => {
      // Cleanup on unmount
      if (sessionPhase !== 'idle' && sessionPhase !== 'session_complete') {
        sessionManager.endSession();
      }
    };
  }, []);

  // Loading states
  if (sessionPhase === 'connecting' || sessionPhase === 'loading_cards') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-lg text-gray-600">
          {sessionPhase === 'connecting' ? 'Connecting to AI Tutor...' : 'Loading cards...'}
        </Text>
        <Text className="mt-2 text-sm text-gray-400">
          {selectedDeck}
        </Text>
      </View>
    );
  }

  // Error state
  if (sessionPhase === 'error' || error) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <Text className="text-4xl">❌</Text>
        </View>
        <Text className="mb-2 text-center text-xl font-bold text-gray-900">
          Session Error
        </Text>
        <Text className="mb-6 text-center text-base text-gray-600">
          {error || 'Something went wrong. Please try again.'}
        </Text>
        <View className="w-full gap-3">
          <Pressable
            onPress={handleRetry}
            className="rounded-xl bg-blue-500 px-6 py-4 active:bg-blue-600"
          >
            <Text className="text-center text-lg font-semibold text-white">
              Try Again
            </Text>
          </Pressable>
          <Pressable
            onPress={handleEndSession}
            className="rounded-xl border-2 border-gray-300 px-6 py-4 active:bg-gray-100"
          >
            <Text className="text-center text-lg font-semibold text-gray-700">
              Go Back
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Session complete state
  if (sessionPhase === 'session_complete') {
    const total = stats.correct + stats.incorrect;
    const percentage = total > 0 ? Math.round((stats.correct / total) * 100) : 0;

    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-green-100">
          <Text className="text-5xl">🎉</Text>
        </View>
        <Text className="mb-2 text-center text-2xl font-bold text-gray-900">
          Session Complete!
        </Text>
        <Text className="mb-6 text-center text-base text-gray-600">
          Great work studying {selectedDeck}
        </Text>

        {/* Stats */}
        <View className="mb-8 w-full rounded-xl bg-gray-100 p-4">
          <View className="mb-3 flex-row justify-between">
            <Text className="text-gray-600">Cards Reviewed</Text>
            <Text className="font-bold text-gray-900">{total}</Text>
          </View>
          <View className="mb-3 flex-row justify-between">
            <Text className="text-green-600">Correct</Text>
            <Text className="font-bold text-green-600">{stats.correct}</Text>
          </View>
          <View className="mb-3 flex-row justify-between">
            <Text className="text-red-600">Incorrect</Text>
            <Text className="font-bold text-red-600">{stats.incorrect}</Text>
          </View>
          <View className="flex-row justify-between border-t border-gray-300 pt-3">
            <Text className="text-gray-600">Accuracy</Text>
            <Text className="font-bold text-gray-900">{percentage}%</Text>
          </View>
        </View>

        <Pressable
          onPress={handleEndSession}
          className="w-full rounded-xl bg-blue-500 px-6 py-4 active:bg-blue-600"
        >
          <Text className="text-center text-lg font-semibold text-white">
            Done
          </Text>
        </Pressable>
      </View>
    );
  }

  // Active session UI
  const remainingCards = cards.length - currentIndex;

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="border-b border-gray-200 px-6 pb-4 pt-16">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-xl font-bold text-gray-900">Study Session</Text>
            <Text className="text-sm text-gray-500">{selectedDeck}</Text>
          </View>
          <View className="items-end">
            <View className="flex-row items-center">
              <View className="mr-2 h-3 w-3 rounded-full bg-green-500" />
              <Text className="text-sm text-green-600">Connected</Text>
            </View>
            <Text className="text-xs text-gray-400">
              {remainingCards} cards remaining
            </Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      <View className="h-2 bg-gray-200">
        <View
          className="h-2 bg-blue-500"
          style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
        />
      </View>

      {/* Main content area */}
      <View className="flex-1 items-center justify-center px-6">
        {/* Microphone indicator */}
        <View className="mb-6 h-32 w-32 items-center justify-center rounded-full bg-blue-100">
          <Text className="text-6xl">
            {sessionPhase === 'awaiting_answer' ? '🎤' : '🔊'}
          </Text>
        </View>

        {/* Phase indicator */}
        <Text className="mb-2 text-center text-xl font-semibold text-gray-900">
          {getPhaseLabel(sessionPhase)}
        </Text>

        {/* Visual companion display */}
        <View className="mt-4 w-full">
          <CardDisplay />
        </View>

        {/* Stats during session */}
        <View className="mt-6 flex-row gap-6">
          <View className="items-center">
            <Text className="text-2xl font-bold text-green-600">{stats.correct}</Text>
            <Text className="text-xs text-gray-500">Correct</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-red-600">{stats.incorrect}</Text>
            <Text className="text-xs text-gray-500">Incorrect</Text>
          </View>
        </View>
      </View>

      {/* Bottom controls */}
      <View className="border-t border-gray-200 px-6 py-4">
        <Pressable
          onPress={handleEndSession}
          className="rounded-xl bg-red-500 px-6 py-4 active:bg-red-600"
        >
          <Text className="text-center text-lg font-semibold text-white">
            End Session
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function getPhaseLabel(phase: string): string {
  switch (phase) {
    case 'ready':
      return 'Ready to start...';
    case 'asking_question':
      return 'Listen to the question...';
    case 'awaiting_answer':
      return 'Speak your answer...';
    case 'evaluating':
      return 'Evaluating...';
    case 'giving_feedback':
      return 'Feedback...';
    case 'advancing':
      return 'Next card...';
    case 'paused':
      return 'Paused';
    default:
      return 'Studying...';
  }
}
