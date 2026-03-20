import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

admin.initializeApp();
const db = admin.firestore();

const openaiApiKey = defineSecret("OPENAI_API_KEY");

const TRIAL_DAYS = 7;
const TRIAL_MAX_SESSIONS = 10;

// ─── getSessionToken ────────────────────────────────────────────────
// Called by the app to get an ephemeral WebRTC token for OpenAI.
// Verifies trial/subscription status and increments session count.
export const getSessionToken = onCall(
  { secrets: [openaiApiKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Must be signed in");
    }

    const uid = request.auth.uid;
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    let userData = userDoc.data();

    // New user — create doc
    if (!userData) {
      userData = {
        trialStart: admin.firestore.FieldValue.serverTimestamp(),
        sessionCount: 0,
        subscriptionStatus: "none",
      };
      await userRef.set(userData);
      // Re-read to get the resolved timestamp
      const freshDoc = await userRef.get();
      userData = freshDoc.data()!;
    }

    // Check access: trial active OR subscription active
    const hasSubscription = userData.subscriptionStatus === "active";
    const trialStart = userData.trialStart?.toDate?.() ?? new Date();
    const daysSinceTrial =
      (Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24);
    const trialActive =
      daysSinceTrial < TRIAL_DAYS &&
      (userData.sessionCount ?? 0) < TRIAL_MAX_SESSIONS;

    if (!hasSubscription && !trialActive) {
      return { error: "trial_expired" };
    }

    // Request ephemeral token from OpenAI GA endpoint
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session: {
            type: "realtime",
            model: "gpt-4o-realtime-preview-2024-12-17",
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenAI token request failed:", response.status, text);
      throw new HttpsError("internal", "Failed to get session token");
    }

    const data = (await response.json()) as { value: string };

    // Increment session count
    await userRef.update({
      sessionCount: admin.firestore.FieldValue.increment(1),
    });

    return { token: data.value };
  }
);

// ─── checkTrialStatus ───────────────────────────────────────────────
// Returns trial/subscription status for the current user.
export const checkTrialStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const uid = request.auth.uid;
  const userRef = db.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    // New user — trial hasn't started yet
    return {
      isActive: true,
      daysRemaining: TRIAL_DAYS,
      sessionsRemaining: TRIAL_MAX_SESSIONS,
      subscriptionActive: false,
    };
  }

  const userData = userDoc.data()!;
  const hasSubscription = userData.subscriptionStatus === "active";

  if (hasSubscription) {
    return {
      isActive: true,
      daysRemaining: 0,
      sessionsRemaining: 0,
      subscriptionActive: true,
    };
  }

  const trialStart = userData.trialStart?.toDate?.() ?? new Date();
  const daysSinceTrial =
    (Date.now() - trialStart.getTime()) / (1000 * 60 * 60 * 24);
  const daysRemaining = Math.max(0, Math.ceil(TRIAL_DAYS - daysSinceTrial));
  const sessionsRemaining = Math.max(
    0,
    TRIAL_MAX_SESSIONS - (userData.sessionCount ?? 0)
  );
  const isActive = daysRemaining > 0 && sessionsRemaining > 0;

  return {
    isActive,
    daysRemaining,
    sessionsRemaining,
    subscriptionActive: false,
  };
});

// ─── verifyPurchase ─────────────────────────────────────────────────
// Called after a successful in-app purchase to update subscription status.
export const verifyPurchase = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be signed in");
  }

  const { purchaseToken, productId } = request.data as {
    purchaseToken: string;
    productId: string;
  };

  if (!purchaseToken || !productId) {
    throw new HttpsError("invalid-argument", "Missing purchaseToken or productId");
  }

  // TODO: Verify purchase with Google Play Developer API
  // For now, trust the client and update status
  const uid = request.auth.uid;
  await db.collection("users").doc(uid).update({
    subscriptionStatus: "active",
    subscriptionProductId: productId,
    subscriptionPurchaseToken: purchaseToken,
    subscriptionUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { status: "success" };
});
