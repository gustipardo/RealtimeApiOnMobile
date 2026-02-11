import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { storeApiKey } from '../../utils/secureStorage';

export default function ApiKeyScreen() {
  const router = useRouter();
  const setApiKeyStored = useSettingsStore((s) => s.setApiKeyStored);
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);

  const [apiKey, setApiKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidKey = apiKey.startsWith('sk-') && apiKey.length > 20;

  async function handleSubmit() {
    if (!isValidKey) {
      setError('Please enter a valid OpenAI API key (starts with sk-)');
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);
    setError(null);

    try {
      await storeApiKey(apiKey);
      setApiKeyStored(true);
      setOnboardingCompleted(true);
      router.replace('/(main)/deck-select');
    } catch (err) {
      setError('Failed to save API key. Please try again.');
      console.error('Failed to store API key:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="flex-1 px-6 pt-16">
        <View className="mb-8 items-center">
          <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-purple-100">
            <Text className="text-4xl">🔑</Text>
          </View>

          <Text className="mb-2 text-center text-2xl font-bold text-gray-900">
            OpenAI API Key
          </Text>

          <Text className="text-center text-base text-gray-600">
            Enter your OpenAI API key to enable voice conversations with the AI
            tutor.
          </Text>
        </View>

        {/* Info box */}
        <View className="mb-6 rounded-xl bg-blue-50 p-4">
          <Text className="mb-2 text-sm font-semibold text-blue-900">
            Where to get an API key:
          </Text>
          <Text className="text-sm text-blue-800">
            1. Go to platform.openai.com{'\n'}
            2. Sign in or create an account{'\n'}
            3. Navigate to API keys section{'\n'}
            4. Create a new secret key
          </Text>
        </View>

        {/* Input */}
        <View className="mb-4">
          <Text className="mb-2 text-sm font-medium text-gray-700">
            API Key
          </Text>
          <TextInput
            value={apiKey}
            onChangeText={(text) => {
              setApiKey(text);
              setError(null);
            }}
            placeholder="sk-..."
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-xl border-2 border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-blue-500"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Error message */}
        {error && (
          <View className="mb-4 rounded-lg bg-red-50 p-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}

        {/* Security note */}
        <View className="mb-6 flex-row items-start">
          <Text className="mr-2 text-green-600">🔒</Text>
          <Text className="flex-1 text-xs text-gray-500">
            Your API key is stored securely on your device using encrypted
            storage. It is never sent to any server other than OpenAI.
          </Text>
        </View>

        {/* Submit button */}
        <Pressable
          onPress={handleSubmit}
          disabled={!isValidKey || isSubmitting}
          className={`rounded-xl px-6 py-4 ${
            isValidKey && !isSubmitting
              ? 'bg-blue-500 active:bg-blue-600'
              : 'bg-gray-300'
          }`}
        >
          <Text
            className={`text-center text-lg font-semibold ${
              isValidKey && !isSubmitting ? 'text-white' : 'text-gray-500'
            }`}
          >
            {isSubmitting ? 'Saving...' : 'Complete Setup'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
