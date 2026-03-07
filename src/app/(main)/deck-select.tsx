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

  // -----------------------------------------------------------------------
  // Loading
  // -----------------------------------------------------------------------
  if (loadingState === 'loading') {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
        <Text className="text-base font-semibold text-gray-700">Loading decks...</Text>
        <Text className="mt-1 text-sm text-gray-400">Connecting to AnkiDroid</Text>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Error
  // -----------------------------------------------------------------------
  if (loadingState === 'error') {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-red-100">
          <Text className="text-3xl font-bold text-red-500">!</Text>
        </View>
        <Text className="mb-2 text-center text-xl font-bold text-gray-900">
          Cannot Load Decks
        </Text>
        <Text className="mb-8 text-center text-base leading-relaxed text-gray-500">
          Could not connect to AnkiDroid. Make sure AnkiDroid is installed, running, and permissions are granted.
        </Text>
        <Pressable
          onPress={loadDecks}
          className="rounded-2xl bg-blue-500 px-10 py-3.5 active:bg-blue-600"
        >
          <Text className="text-base font-bold text-white">Try Again</Text>
        </Pressable>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Empty
  // -----------------------------------------------------------------------
  if (loadingState === 'empty') {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8">
        <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <Text className="text-3xl font-bold text-amber-600">0</Text>
        </View>
        <Text className="mb-2 text-center text-xl font-bold text-gray-900">
          No Decks Found
        </Text>
        <Text className="mb-8 text-center text-base leading-relaxed text-gray-500">
          AnkiDroid does not have any decks yet. Create or import some decks in AnkiDroid, then come back.
        </Text>
        <Pressable
          onPress={handleRefresh}
          className="rounded-2xl bg-blue-500 px-10 py-3.5 active:bg-blue-600"
        >
          <Text className="text-base font-bold text-white">Refresh</Text>
        </Pressable>
      </View>
    );
  }

  // -----------------------------------------------------------------------
  // Deck list
  // -----------------------------------------------------------------------
  const totalDue = decks.reduce((sum, d) => sum + d.dueCount, 0);

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 pb-5 pt-16 shadow-sm">
        <Text className="text-2xl font-bold text-gray-900">Choose a Deck</Text>
        <Text className="mt-1 text-sm text-gray-500">
          {decks.length} deck{decks.length !== 1 ? 's' : ''}
          {totalDue > 0 ? ` \u00B7 ${totalDue} card${totalDue !== 1 ? 's' : ''} due` : ''}
        </Text>
      </View>

      <FlatList
        data={decks}
        keyExtractor={(item) => item.deckName}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ItemSeparatorComponent={() => <View className="h-2.5" />}
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

// ---------------------------------------------------------------------------
// DeckCard
// ---------------------------------------------------------------------------
function DeckCard({
  deck,
  onPress,
}: {
  deck: DeckInfo;
  onPress: () => void;
}) {
  const hasDue = deck.dueCount > 0;

  return (
    <Pressable
      onPress={onPress}
      className="rounded-2xl border border-gray-200 bg-white px-5 py-4 active:border-blue-400 active:bg-blue-50"
    >
      <View className="flex-row items-center">
        {/* Left icon */}
        <View
          className={`mr-4 h-11 w-11 items-center justify-center rounded-xl ${
            hasDue ? 'bg-blue-100' : 'bg-gray-100'
          }`}
        >
          <Text className={`text-base font-bold ${hasDue ? 'text-blue-600' : 'text-gray-400'}`}>
            {deck.dueCount > 0 ? deck.dueCount : '-'}
          </Text>
        </View>

        {/* Deck info */}
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
            {deck.deckName}
          </Text>
          <Text className={`mt-0.5 text-xs ${hasDue ? 'font-medium text-blue-600' : 'text-gray-400'}`}>
            {hasDue
              ? `${deck.dueCount} card${deck.dueCount !== 1 ? 's' : ''} due for review`
              : 'No cards due'}
          </Text>
        </View>

        {/* Chevron */}
        <Text className="ml-2 text-lg text-gray-300">{'\u203A'}</Text>
      </View>
    </Pressable>
  );
}
