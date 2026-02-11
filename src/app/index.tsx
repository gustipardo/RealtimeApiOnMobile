import { Redirect } from 'expo-router';
import { useSettingsStore } from '../stores/useSettingsStore';

export default function Index() {
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);

  // If onboarding is complete, go to deck selection
  if (onboardingCompleted) {
    return <Redirect href="/(main)/deck-select" />;
  }

  // Otherwise, start onboarding
  return <Redirect href="/(onboarding)" />;
}
