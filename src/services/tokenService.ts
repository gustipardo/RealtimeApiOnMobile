import functions from '@react-native-firebase/functions';
import { isDev } from '../config/env';
import { getApiKey } from '../utils/secureStorage';

export interface TokenResult {
  token: string;
}

export interface TokenError {
  error: 'trial_expired' | 'auth_required' | 'unknown';
  message?: string;
}

/**
 * Get an auth token for the OpenAI Realtime API.
 *
 * - Dev mode: returns the API key from secure storage (direct key).
 * - Prod mode: calls the Firebase Cloud Function `getSessionToken`
 *   which returns an ephemeral token (starts with "ek_").
 */
export async function getToken(): Promise<TokenResult> {
  if (isDev()) {
    const apiKey = await getApiKey();
    if (!apiKey) {
      throw new Error('No API key found. Please add your OpenAI API key in settings.');
    }
    return { token: apiKey };
  }

  // Production: call cloud function for ephemeral token
  const callable = functions().httpsCallable('getSessionToken');
  const result = await callable();
  const data = result.data as any;

  if (data.error) {
    const err: TokenError = {
      error: data.error,
      message: data.message,
    };
    throw err;
  }

  if (!data.token) {
    throw { error: 'unknown', message: 'No token in response' } as TokenError;
  }

  return { token: data.token };
}

/**
 * Check if a thrown error is a TokenError (e.g., trial_expired).
 */
export function isTokenError(err: unknown): err is TokenError {
  return typeof err === 'object' && err !== null && 'error' in err;
}
