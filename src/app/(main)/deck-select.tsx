import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { ankiBridge } from '../../native/ankiBridge';
import type { DeckInfo } from '../../types/anki';

type LoadingState = 'loading' | 'loaded' | 'error' | 'empty';

export default function DeckSelectScreen() {
  const router = useRouter();
  const setSelectedDeck = useSettingsStore((s) => s.setSelectedDeck);

  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const loadDecks = useCallback(async () => {
    try {
      const deckInfos = await ankiBridge.getDeckInfo();

      if (deckInfos.length === 0) {
        setLoadingState('empty');
        setDecks([]);
        return;
      }

      setDecks(deckInfos);
      setLoadingState('loaded');
    } catch (error) {
      console.error('Failed to load decks:', error);
      setLoadingState('error');
    }
  }, []);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadDecks();
    setRefreshing(false);
  }

  function handleSelectDeck(deckName: string) {
    setSelectedDeck(deckName);
    router.push('/(main)/session');
  }

  if (loadingState === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="mt-4 text-base text-gray-600">Loading decks...</Text>
      </View>
    );
  }

  if (loadingState === 'error') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <Text className="text-4xl">⚠️</Text>
        </View>
        <Text className="mb-2 text-center text-xl font-bold text-gray-900">
          Failed to Load Decks
        </Text>
        <Text className="mb-6 text-center text-base text-gray-600">
          Could not connect to AnkiDroid. Make sure AnkiDroid is running and
          permissions are granted.
        </Text>
        <Pressable
          onPress={loadDecks}
          className="rounded-xl bg-blue-500 px-8 py-3 active:bg-blue-600"
        >
          <Text className="font-semibold text-white">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (loadingState === 'empty') {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <Text className="text-4xl">📚</Text>
        </View>
        <Text className="mb-2 text-center text-xl font-bold text-gray-900">
          No Decks Found
        </Text>
        <Text className="mb-6 text-center text-base text-gray-600">
          AnkiDroid doesn't have any decks yet. Create or import some decks in
          AnkiDroid, then come back here.
        </Text>
        <Pressable
          onPress={handleRefresh}
          className="rounded-xl bg-blue-500 px-8 py-3 active:bg-blue-600"
        >
          <Text className="font-semibold text-white">Refresh</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="border-b border-gray-200 px-6 pb-4 pt-16">
        <Text className="text-2xl font-bold text-gray-900">Select a Deck</Text>
        <Text className="mt-1 text-base text-gray-600">
          Choose a deck to start your voice study session
        </Text>
      </View>

      <FlatList
        data={decks}
        keyExtractor={(item) => item.deckName}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => (
          <DeckCard
            deck={item}
            onPress={() => handleSelectDeck(item.deckName)}
          />
        )}
        ListEmptyComponent={
          <View className="items-center py-8">
            <Text className="text-gray-500">No decks available</Text>
          </View>
        }
      />

    </View>
  );
}

function DeckCard({
  deck,
  onPress,
}: {
  deck: DeckInfo;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-xl border-2 border-gray-200 p-4 active:border-blue-400 active:bg-blue-50"
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-lg font-semibold text-gray-900">
            {deck.deckName}
          </Text>
          {deck.dueCount > 0 && (
            <Text className="mt-1 text-sm text-gray-600">
              {`${deck.dueCount} card${deck.dueCount !== 1 ? 's' : ''} due`}
            </Text>
          )}
        </View>

        {deck.dueCount > 0 && (
          <View className="ml-4 rounded-full bg-blue-500 px-3 py-1">
            <Text className="text-sm font-bold text-white">{deck.dueCount}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
