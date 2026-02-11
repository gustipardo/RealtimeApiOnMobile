import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SettingsStore {
  selectedDeck: string | null;
  onboardingCompleted: boolean;
  apiKeyStored: boolean;
  setSelectedDeck: (deck: string | null) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  setApiKeyStored: (stored: boolean) => void;
}

export const useSettingsStore = create(
  persist<SettingsStore>(
    (set) => ({
      selectedDeck: null,
      onboardingCompleted: false,
      apiKeyStored: false,

      setSelectedDeck: (selectedDeck) => set({ selectedDeck }),
      setOnboardingCompleted: (onboardingCompleted) => set({ onboardingCompleted }),
      setApiKeyStored: (apiKeyStored) => set({ apiKeyStored }),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
