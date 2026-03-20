import '../../global.css';
import { useEffect } from 'react';
import { Slot } from 'expo-router';
import Constants from 'expo-constants';
import { storeApiKey, hasApiKey } from '../utils/secureStorage';
import { useSettingsStore } from '../stores/useSettingsStore';
import { isDev } from '../config/env';
import { initAnalytics, AnalyticsEvents } from '../services/analytics';
import { initBilling } from '../services/billingService';
import { configureGoogleSignIn } from '../services/authService';

// PostHog config — replace with your actual project key and host
const POSTHOG_API_KEY = 'YOUR_POSTHOG_API_KEY';
const POSTHOG_HOST = 'https://us.i.posthog.com';

// Google Sign-In web client ID from Firebase Console
const GOOGLE_WEB_CLIENT_ID = 'YOUR_GOOGLE_WEB_CLIENT_ID';

export default function RootLayout() {
  const setApiKeyStored = useSettingsStore((s) => s.setApiKeyStored);
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);

  useEffect(() => {
    // Dev mode: auto-inject API key from env
    if (isDev()) {
      const envKey = Constants.expoConfig?.extra?.openaiApiKey;
      if (envKey) {
        hasApiKey().then((already) => {
          if (already) return;
          storeApiKey(envKey).then(() => {
            setApiKeyStored(true);
            setOnboardingCompleted(true);
          });
        });
      }
    }

    // Initialize analytics
    initAnalytics(POSTHOG_API_KEY, POSTHOG_HOST);
    AnalyticsEvents.appOpened();

    // Production-only init
    if (!isDev()) {
      configureGoogleSignIn(GOOGLE_WEB_CLIENT_ID);
      initBilling().catch((err) =>
        console.warn('Billing init failed:', err)
      );
    }
  }, []);

  return <Slot />;
}
