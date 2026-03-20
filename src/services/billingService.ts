import {
  initConnection,
  fetchProducts,
  requestPurchase,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Purchase,
  type PurchaseError,
  type EventSubscription,
} from 'react-native-iap';
import functions from '@react-native-firebase/functions';
import { isProd } from '../config/env';

export type SubscriptionSku = 'monthly_499' | 'yearly_3999';

const SKU_MAP: Record<SubscriptionSku, string> = {
  monthly_499: 'com.ankiconversacionales.app.monthly',
  yearly_3999: 'com.ankiconversacionales.app.yearly',
};

let purchaseUpdateSubscription: EventSubscription | null = null;
let purchaseErrorSubscription: EventSubscription | null = null;

/**
 * Initialize the billing connection and listeners.
 * Call once at app startup (prod mode only).
 */
export async function initBilling(): Promise<void> {
  if (!isProd()) return;

  await initConnection();

  purchaseUpdateSubscription = purchaseUpdatedListener(
    async (purchase: Purchase) => {
      // Acknowledge the purchase
      await finishTransaction({ purchase });

      // Notify backend to update subscription status
      try {
        const callable = functions().httpsCallable('verifyPurchase');
        await callable({
          purchaseToken: (purchase as any).purchaseToken,
          productId: purchase.productId,
        });
      } catch (err) {
        console.error('[Billing] Failed to verify purchase:', err);
      }
    }
  );

  purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
    console.error('[Billing] Purchase error:', error);
  });
}

/**
 * Purchase a subscription.
 */
export async function purchaseSubscription(sku: SubscriptionSku): Promise<void> {
  const productId = SKU_MAP[sku];
  const products = await fetchProducts({ skus: [productId] });

  if (!products || products.length === 0) {
    throw new Error('Subscription product not found');
  }

  const offerToken =
    (products[0] as any).subscriptionOfferDetails?.[0]?.offerToken ?? undefined;

  await requestPurchase({
    type: 'subs',
    request: {
      google: {
        skus: [productId],
        subscriptionOffers: offerToken
          ? [{ sku: productId, offerToken }]
          : null,
      },
    },
  });
}

/**
 * Cleanup billing listeners.
 */
export function cleanupBilling(): void {
  purchaseUpdateSubscription?.remove();
  purchaseErrorSubscription?.remove();
  purchaseUpdateSubscription = null;
  purchaseErrorSubscription = null;
}
