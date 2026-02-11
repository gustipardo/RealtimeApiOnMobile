import * as SecureStore from 'expo-secure-store';

const API_KEY_STORAGE_KEY = 'openai_api_key';

/**
 * Securely store the OpenAI API key.
 * Uses expo-secure-store for encrypted storage on device.
 */
export async function storeApiKey(apiKey: string): Promise<void> {
  await SecureStore.setItemAsync(API_KEY_STORAGE_KEY, apiKey);
}

/**
 * Retrieve the stored OpenAI API key.
 * Returns null if no key is stored.
 */
export async function getApiKey(): Promise<string | null> {
  return await SecureStore.getItemAsync(API_KEY_STORAGE_KEY);
}

/**
 * Delete the stored OpenAI API key.
 */
export async function deleteApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);
}

/**
 * Check if an API key is stored (without retrieving it).
 */
export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return key !== null && key.length > 0;
}
