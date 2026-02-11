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
  const [selectedDeckName, setSelectedDeckName] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    try {
      const deckNames = await ankiBridge.getDeckNames();

      if (deckNames.length === 0) {
        setLoadingState('empty');
        setDecks([]);
        return;
      }

      // For each deck, get the due card count
      // Note: This is a simplified version - real implementation in 2-5
      // will use a more efficient query
      const deckInfos: DeckInfo[] = await Promise.all(
        deckNames.map(async (deckName) => {
          const dueCards = await ankiBridge.getDueCards(deckName);
          return {
            deckName,
            dueCount: dueCards.length,
          };
        })
      );

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

  function handleSelectDeck(deckName: string, dueCount: number) {
    if (dueCount === 0) {
      // Show message that deck has no due cards
      setSelectedDeckName(deckName);
      return;
    }

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
            isSelected={selectedDeckName === item.deckName && item.dueCount === 0}
            onPress={() => handleSelectDeck(item.deckName, item.dueCount)}
          />
        )}
        ListEmptyComponent={
          <View className="items-center py-8">
            <Text className="text-gray-500">No decks available</Text>
          </View>
        }
      />

      {/* No due cards message */}
      {selectedDeckName && decks.find((d) => d.deckName === selectedDeckName)?.dueCount === 0 && (
        <View className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-amber-50 p-4">
          <Text className="text-center text-amber-800">
            No cards due for review in "{selectedDeckName}".{'\n'}
            Try another deck or check back later.
          </Text>
        </View>
      )}
    </View>
  );
}

function DeckCard({
  deck,
  isSelected,
  onPress,
}: {
  deck: DeckInfo;
  isSelected: boolean;
  onPress: () => void;
}) {
  const hasDueCards = deck.dueCount > 0;

  return (
    <Pressable
      onPress={onPress}
      className={`mb-3 rounded-xl border-2 p-4 ${
        isSelected
          ? 'border-amber-400 bg-amber-50'
          : hasDueCards
          ? 'border-gray-200 active:border-blue-400 active:bg-blue-50'
          : 'border-gray-100 bg-gray-50'
      }`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text
            className={`text-lg font-semibold ${
              hasDueCards ? 'text-gray-900' : 'text-gray-400'
            }`}
          >
            {deck.deckName}
          </Text>
          <Text
            className={`mt-1 text-sm ${
              hasDueCards ? 'text-gray-600' : 'text-gray-400'
            }`}
          >
            {deck.dueCount === 0
              ? 'No cards due'
              : `${deck.dueCount} card${deck.dueCount !== 1 ? 's' : ''} due`}
          </Text>
        </View>

        {hasDueCards && (
          <View className="ml-4 rounded-full bg-blue-500 px-3 py-1">
            <Text className="text-sm font-bold text-white">{deck.dueCount}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
