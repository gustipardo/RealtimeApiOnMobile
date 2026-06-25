import auth, { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { authBypassed } from "../config/env";

/**
 * App-level user shape — deliberately decoupled from `FirebaseAuthTypes.User`
 * so the rest of the app depends on this small interface, not on Firebase.
 * That decoupling is what makes the dev bypass clean: when auth is bypassed we
 * hand back a fake `AppUser` and nothing downstream knows or cares.
 */
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

/**
 * Deterministic fake user used when the auth gate is bypassed (dev only).
 * Mirrors the `fakeMicSource` swap: code reading `currentUser` (analytics,
 * Firestore keys, trial lookups) stays coherent instead of seeing `null`.
 */
export const FAKE_DEV_USER: AppUser = {
  uid: "dev-user",
  email: "dev@engram.local",
  displayName: "Dev User",
  photoURL: null,
};

function toAppUser(u: FirebaseAuthTypes.User | null): AppUser | null {
  if (!u) return null;
  return {
    uid: u.uid,
    email: u.email,
    displayName: u.displayName,
    photoURL: u.photoURL,
  };
}

/**
 * Configure Google Sign-In. Call once at app startup (only when auth is
 * required). The webClientId comes from google-services.json (Firebase Console).
 */
export function configureGoogleSignIn(webClientId: string): void {
  GoogleSignin.configure({ webClientId });
}

/**
 * Sign in with Google. Returns the app user.
 * When auth is bypassed (dev), resolves to the fake user without touching
 * Firebase/Google at all.
 */
export async function signInWithGoogle(): Promise<AppUser> {
  if (authBypassed()) return FAKE_DEV_USER;

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error("Google Sign-In failed: no idToken");
  }

  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  const userCredential = await auth().signInWithCredential(googleCredential);
  return toAppUser(userCredential.user)!;
}

/**
 * Sign out of Firebase and Google. No-op when auth is bypassed.
 */
export async function signOut(): Promise<void> {
  if (authBypassed()) return;
  try {
    await GoogleSignin.revokeAccess();
  } catch (_) {
    // May fail if already revoked
  }
  await auth().signOut();
}

/**
 * Get the currently signed-in user, or null.
 * Bypassed (dev) → the fake user; otherwise the real Firebase user mapped to
 * `AppUser`.
 */
export function getCurrentUser(): AppUser | null {
  if (authBypassed()) return FAKE_DEV_USER;
  return toAppUser(auth().currentUser);
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 * Bypassed (dev) → emits the fake user once and returns a no-op unsubscribe
 * (no Firebase listener is attached).
 */
export function onAuthStateChanged(
  callback: (user: AppUser | null) => void,
): () => void {
  if (authBypassed()) {
    callback(FAKE_DEV_USER);
    return () => {};
  }
  return auth().onAuthStateChanged((u) => callback(toAppUser(u)));
}
