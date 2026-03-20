import functions from '@react-native-firebase/functions';
import { isProd } from '../config/env';

export interface TrialStatus {
  isActive: boolean;
  daysRemaining: number;
  sessionsRemaining: number;
  subscriptionActive: boolean;
}

/**
 * Check the user's trial/subscription status.
 * In dev mode, always returns an active trial.
 * In prod mode, calls the cloud function to check Firestore.
 */
export async function checkTrialStatus(): Promise<TrialStatus> {
  if (!isProd()) {
    return {
      isActive: true,
      daysRemaining: 99,
      sessionsRemaining: 99,
      subscriptionActive: false,
    };
  }

  const callable = functions().httpsCallable('checkTrialStatus');
  const result = await callable();
  return result.data as TrialStatus;
}
