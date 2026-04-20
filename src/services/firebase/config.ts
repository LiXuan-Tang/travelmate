import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Capture whether this is the first initialization BEFORE calling initializeApp,
// so we know whether to call initializeAuth (first time) vs getAuth (hot reload).
const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();

function createAuth() {
  try {
    // Lazily require AsyncStorage so the app does not crash if the native
    // module hasn't been compiled into the build yet (e.g. before running
    // `npx expo run:android`). When the module is available, auth state will
    // persist across app restarts; otherwise it falls back to memory-only.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    if (AsyncStorage) {
      return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
    }
  } catch {
    // Native module not compiled into this build — use memory persistence.
  }
  return getAuth(app);
}

export const auth = isFirstInit ? createAuth() : getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
