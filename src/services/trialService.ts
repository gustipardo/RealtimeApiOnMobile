import functions from "@react-native-firebase/functions";
import { requiresPayment } from "../config/env";

export interface TrialStatus {
  isActive: boolean;
  daysRemaining: number;
  sessionsRemaining: number;
  subscriptionActive: boolean;
}

/**
 * Check the user's trial/subscription status.
 * When payment is bypassed (dev), returns a fully-unlocked status so all
 * subscription-gated UI behaves as if the user has access.
 * Otherwise calls the cloud function to check Firestore.
 */
export async function checkTrialStatus(): Promise<TrialStatus> {
  if (!requiresPayment()) {
    return {
      isActive: true,
      daysRemaining: 99,
      sessionsRemaining: 99,
      subscriptionActive: true,
    };
  }

  const callable = functions().httpsCallable("checkTrialStatus");
  const result = await callable();
  return result.data as TrialStatus;
}
