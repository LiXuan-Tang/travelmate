import { Platform } from 'react-native';
import type { GoogleSignin as TGoogleSignin, isSuccessResponse as TIsSuccessResponse } from '@react-native-google-signin/google-signin';
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';

let _nativeModuleAvailable = false;
let GoogleSignin: typeof TGoogleSignin;
let isSuccessResponse: typeof TIsSuccessResponse;

if (Platform.OS !== 'web') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
    GoogleSignin = mod.GoogleSignin;
    isSuccessResponse = mod.isSuccessResponse;
    _nativeModuleAvailable = true;
    GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[TravelMate] RNGoogleSignin not found:', msg);
  }
}

const upsertUserDoc = async (user: User): Promise<void> => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      bio: '',
      isAdmin: false,
      createdAt: serverTimestamp(),
    });
  }
};

export const signInWithGoogle = async (): Promise<User> => {
  if (Platform.OS === 'web') {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    await upsertUserDoc(user);
    return user;
  }

  if (!_nativeModuleAvailable) {
    throw new Error('Google Sign-In requires a development build. Run: npx expo run:android');
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    throw new Error('Google Sign-In was cancelled.');
  }

  const { idToken } = response.data;
  const credential = GoogleAuthProvider.credential(idToken);
  const { user } = await signInWithCredential(auth, credential);
  await upsertUserDoc(user);

  return user;
};

export const logoutUser = async (): Promise<void> => {
  if (Platform.OS !== 'web' && _nativeModuleAvailable) {
    await GoogleSignin.signOut();
  }
  await signOut(auth);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
