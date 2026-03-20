import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { purchaseSubscription, SubscriptionSku } from '../../services/billingService';
import { AnalyticsEvents } from '../../services/analytics';

export default function PaywallScreen() {
  const router = useRouter();
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');

  async function handlePurchase() {
    setPurchasing(true);
    setError(null);

    try {
      const sku: SubscriptionSku =
        selectedPlan === 'monthly' ? 'monthly_499' : 'yearly_3999';

      await purchaseSubscription(sku);
      AnalyticsEvents.subscriptionStarted(selectedPlan);
      router.replace('/(main)/deck-select');
    } catch (err: any) {
      console.error('Purchase failed:', err);
      setError(err.message || 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <View className="mb-8 items-center">
        <Text className="mb-2 text-center text-2xl font-bold text-gray-900">
          Your Free Trial Has Ended
        </Text>
        <Text className="text-center text-base text-gray-600">
          Subscribe to continue studying with your AI voice tutor
        </Text>
      </View>

      {/* Plan options */}
      <Pressable
        onPress={() => setSelectedPlan('yearly')}
        className={`mb-3 rounded-xl border-2 p-4 ${
          selectedPlan === 'yearly' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        }`}
      >
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-lg font-bold text-gray-900">Yearly</Text>
            <Text className="text-sm text-gray-600">$39.99/year ($3.33/mo)</Text>
          </View>
          <View className="rounded-full bg-green-100 px-3 py-1">
            <Text className="text-xs font-semibold text-green-700">Save 33%</Text>
          </View>
        </View>
      </Pressable>

      <Pressable
        onPress={() => setSelectedPlan('monthly')}
        className={`mb-6 rounded-xl border-2 p-4 ${
          selectedPlan === 'monthly' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
        }`}
      >
        <View>
          <Text className="text-lg font-bold text-gray-900">Monthly</Text>
          <Text className="text-sm text-gray-600">$4.99/month</Text>
        </View>
      </Pressable>

      {error && (
        <View className="mb-4 rounded-lg bg-red-50 p-3">
          <Text className="text-center text-sm text-red-700">{error}</Text>
        </View>
      )}

      <Pressable
        onPress={handlePurchase}
        disabled={purchasing}
        className={`rounded-xl px-6 py-4 ${
          purchasing ? 'bg-gray-300' : 'bg-blue-500 active:bg-blue-600'
        }`}
      >
        {purchasing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text className="text-center text-lg font-semibold text-white">
            Subscribe
          </Text>
        )}
      </Pressable>

      <Pressable onPress={() => router.back()} className="mt-4 py-3">
        <Text className="text-center text-sm text-gray-500">Maybe later</Text>
      </Pressable>
    </View>
  );
}
