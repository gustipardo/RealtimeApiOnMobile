import Constants from 'expo-constants';

export type AppMode = 'dev' | 'production';

/**
 * Determine the current app mode.
 * Priority: APP_MODE env variable > __DEV__ global.
 */
export function getAppMode(): AppMode {
  const envMode = Constants.expoConfig?.extra?.appMode;
  if (envMode === 'production' || envMode === 'dev') {
    return envMode;
  }
  return __DEV__ ? 'dev' : 'production';
}

export function isDev(): boolean {
  return getAppMode() === 'dev';
}

export function isProd(): boolean {
  return getAppMode() === 'production';
}

/** True in production — requires Firebase Auth sign-in. */
export function requiresAuth(): boolean {
  return isProd();
}

/** True in production — enforces trial/subscription checks. */
export function requiresPayment(): boolean {
  return isProd();
}
