import '../../global.css';
import { useEffect } from 'react';
import { Slot } from 'expo-router';
import Constants from 'expo-constants';
import { storeApiKey, hasApiKey } from '../utils/secureStorage';
import { useSettingsStore } from '../stores/useSettingsStore';

export default function RootLayout() {
  const setApiKeyStored = useSettingsStore((s) => s.setApiKeyStored);
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);

  useEffect(() => {
    const envKey = Constants.expoConfig?.extra?.openaiApiKey;
    if (!envKey) return;

    hasApiKey().then((already) => {
      if (already) return;
      storeApiKey(envKey).then(() => {
        setApiKeyStored(true);
        setOnboardingCompleted(true);
      });
    });
  }, []);

  return <Slot />;
}
