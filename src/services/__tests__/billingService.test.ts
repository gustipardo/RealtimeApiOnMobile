/**
 * Tests for billingService's read/restore/manage helpers. Same invariant the
 * trialService suite pins: a dev binary (requiresPayment === false) must NEVER
 * touch Play or the backend. Plus the production happy paths for price mapping,
 * restore re-verification, and the Play manage-subscription deep link.
 *
 * Mirrors the mocking style in trialService.test.ts.
 */
const mockRequiresPayment = jest.fn();
const mockFetchProducts = jest.fn();
const mockGetAvailablePurchases = jest.fn();
const mockRequestPurchase = jest.fn();
const mockCallable = jest.fn();
const mockOpenURL = jest.fn();

jest.mock("../../config/env", () => ({
  requiresPayment: (...a: unknown[]) => mockRequiresPayment(...a),
}));

jest.mock("react-native-iap", () => ({
  __esModule: true,
  initConnection: jest.fn(),
  fetchProducts: (...a: unknown[]) => mockFetchProducts(...a),
  requestPurchase: (...a: unknown[]) => mockRequestPurchase(...a),
  finishTransaction: jest.fn(),
  getAvailablePurchases: (...a: unknown[]) => mockGetAvailablePurchases(...a),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock("react-native", () => ({
  __esModule: true,
  Linking: { openURL: (...a: unknown[]) => mockOpenURL(...a) },
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { android: { package: "com.test.app" } } },
}));

jest.mock("@react-native-firebase/functions", () => ({
  __esModule: true,
  default: () => ({
    httpsCallable:
      (name: string) =>
      (...args: unknown[]) =>
        mockCallable(name, ...args),
  }),
}));

import {
  getSubscriptionPrices,
  restorePurchases,
  openManageSubscriptions,
  purchaseSubscription,
} from "../billingService";

const MONTHLY = "com.ankiconversacionales.app.monthly";
const YEARLY = "com.ankiconversacionales.app.yearly";

beforeEach(() => {
  jest.clearAllMocks();
  mockRequiresPayment.mockReturnValue(true);
});

describe("billingService — dev bypass (requiresPayment === false)", () => {
  beforeEach(() => mockRequiresPayment.mockReturnValue(false));

  it("getSubscriptionPrices returns {} without querying Play", async () => {
    expect(await getSubscriptionPrices()).toEqual({});
    expect(mockFetchProducts).not.toHaveBeenCalled();
  });

  it("restorePurchases returns true without touching Play or the backend", async () => {
    expect(await restorePurchases()).toBe(true);
    expect(mockGetAvailablePurchases).not.toHaveBeenCalled();
    expect(mockCallable).not.toHaveBeenCalled();
  });
});

describe("billingService — production mode", () => {
  it("getSubscriptionPrices maps localized displayPrice by product id", async () => {
    mockFetchProducts.mockResolvedValueOnce([
      { id: MONTHLY, displayPrice: "$4.99" },
      { id: YEARLY, displayPrice: "$39.99" },
    ]);
    expect(await getSubscriptionPrices()).toEqual({
      monthly: "$4.99",
      yearly: "$39.99",
    });
  });

  it("getSubscriptionPrices returns {} on fetch failure (best-effort)", async () => {
    mockFetchProducts.mockRejectedValueOnce(new Error("network"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(await getSubscriptionPrices()).toEqual({});
    warn.mockRestore();
  });

  it("restorePurchases re-verifies our owned subs and returns true", async () => {
    mockGetAvailablePurchases.mockResolvedValueOnce([
      { productId: YEARLY, purchaseToken: "tok-1" },
      { productId: "com.someoneelse.app.thing", purchaseToken: "tok-x" },
    ]);
    mockCallable.mockResolvedValue({ data: { status: "success" } });

    expect(await restorePurchases()).toBe(true);
    // Only our product is re-verified; the foreign sku is ignored.
    expect(mockCallable).toHaveBeenCalledTimes(1);
    expect(mockCallable).toHaveBeenCalledWith("verifyPurchase", {
      purchaseToken: "tok-1",
      productId: YEARLY,
    });
  });

  it("restorePurchases returns false when none of our subs are owned", async () => {
    mockGetAvailablePurchases.mockResolvedValueOnce([]);
    expect(await restorePurchases()).toBe(false);
    expect(mockCallable).not.toHaveBeenCalled();
  });

  it("openManageSubscriptions deep-links to Play with sku + package", async () => {
    await openManageSubscriptions("yearly_3999");
    expect(mockOpenURL).toHaveBeenCalledWith(
      `https://play.google.com/store/account/subscriptions?sku=${YEARLY}&package=com.test.app`,
    );
  });

  it("openManageSubscriptions falls back to the list with no sku", async () => {
    await openManageSubscriptions();
    expect(mockOpenURL).toHaveBeenCalledWith(
      "https://play.google.com/store/account/subscriptions",
    );
  });

  it("openManageSubscriptions deep-links with the monthly sku", async () => {
    await openManageSubscriptions("monthly_499");
    expect(mockOpenURL).toHaveBeenCalledWith(
      `https://play.google.com/store/account/subscriptions?sku=${MONTHLY}&package=com.test.app`,
    );
  });

  it("getSubscriptionPrices handles a partial response (only one product)", async () => {
    mockFetchProducts.mockResolvedValueOnce([
      { id: MONTHLY, displayPrice: "$4.99" },
    ]);
    // Yearly missing → undefined, no crash.
    expect(await getSubscriptionPrices()).toEqual({
      monthly: "$4.99",
      yearly: undefined,
    });
  });

  it("restorePurchases skips a malformed entry (missing token) but restores a valid one", async () => {
    mockGetAvailablePurchases.mockResolvedValueOnce([
      { productId: MONTHLY }, // malformed: no purchaseToken → skipped
      { productId: YEARLY, purchaseToken: "tok-ok" },
    ]);
    mockCallable.mockResolvedValue({ data: { status: "success" } });

    expect(await restorePurchases()).toBe(true);
    expect(mockCallable).toHaveBeenCalledTimes(1);
    expect(mockCallable).toHaveBeenCalledWith("verifyPurchase", {
      purchaseToken: "tok-ok",
      productId: YEARLY,
    });
  });

  it("restorePurchases returns false (no crash) when getAvailablePurchases rejects", async () => {
    mockGetAvailablePurchases.mockRejectedValueOnce(new Error("iap down"));
    const err = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(await restorePurchases()).toBe(false);
    err.mockRestore();
  });

  it("purchaseSubscription queries Play with type:'subs'", async () => {
    mockFetchProducts.mockResolvedValueOnce([
      { id: YEARLY, subscriptionOfferDetails: [{ offerToken: "ot-1" }] },
    ]);
    mockRequestPurchase.mockResolvedValueOnce(undefined);

    await purchaseSubscription("yearly_3999");

    expect(mockFetchProducts).toHaveBeenCalledWith({
      skus: [YEARLY],
      type: "subs",
    });
    expect(mockRequestPurchase).toHaveBeenCalledTimes(1);
  });

  it("purchaseSubscription rejects when the product fetch is empty", async () => {
    mockFetchProducts.mockResolvedValueOnce([]);
    await expect(purchaseSubscription("monthly_499")).rejects.toThrow(
      "Subscription product not found",
    );
    expect(mockRequestPurchase).not.toHaveBeenCalled();
  });
});
