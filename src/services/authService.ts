import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { isProd } from '../config/env';

/**
 * Configure Google Sign-In. Call once at app startup (prod mode only).
 * The webClientId comes from google-services.json (Firebase Console).
 */
export function configureGoogleSignIn(webClientId: string): void {
  GoogleSignin.configure({ webClientId });
}

/**
 * Sign in with Google. Returns the Firebase user.
 */
export async function signInWithGoogle(): Promise<FirebaseAuthTypes.User> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();
  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error('Google Sign-In failed: no idToken');
  }

  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  const userCredential = await auth().signInWithCredential(googleCredential);
  return userCredential.user;
}

/**
 * Sign out of Firebase and Google.
 */
export async function signOut(): Promise<void> {
  try {
    await GoogleSignin.revokeAccess();
  } catch (_) {
    // May fail if already revoked
  }
  await auth().signOut();
}

/**
 * Get the currently signed-in user, or null.
 */
export function getCurrentUser(): FirebaseAuthTypes.User | null {
  if (!isProd()) return null;
  return auth().currentUser;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function.
 */
export function onAuthStateChanged(
  callback: (user: FirebaseAuthTypes.User | null) => void
): () => void {
  return auth().onAuthStateChanged(callback);
}
