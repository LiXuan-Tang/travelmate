/**
 * auth.test.js
 *
 * Module 1 — Authentication
 * Covers UT01–UT06
 *
 *   UT01 — Verify that a successful Google Sign-In creates a new user document and returns the authenticated user
 *   UT02 — Verify that a failed Google Sign-In propagates the Firebase authentication error to the caller
 *   UT03 — Verify that a new user's Firestore profile document is written on first sign-in
 *   UT04 — Verify that an existing user does not trigger a Firestore write on subsequent sign-in
 *   UT05 — Verify that the auth-state subscriber receives a non-null user object when authenticated
 *   UT06 — Verify that the auth-state subscriber receives null when no user is authenticated
 */

// Force the web code-path so we test signInWithPopup, not the native GoogleSignin
jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (spec) => spec.web ?? spec.default },
}));

jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: jest.fn().mockImplementation(() => ({
    providerId: 'google.com',
    setCustomParameters: jest.fn(),
  })),
  signInWithPopup: jest.fn(),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({ id: 'users/user-123' })),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
}));

const authService = require('../src/services/firebase/auth');
const firebaseAuth = require('firebase/auth');
const firebaseFirestore = require('firebase/firestore');

describe('Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── UT01 ──────────────────────────────────────────────────────────────────
  test('UT01 — Verify that a successful Google Sign-In creates a new user document and returns the authenticated user', async () => {
    const mockUser = {
      uid: 'user-abc-123',
      email: 'alice@example.com',
      displayName: 'Alice',
      photoURL: null,
    };

    firebaseAuth.signInWithPopup.mockResolvedValue({ user: mockUser });
    firebaseFirestore.getDoc.mockResolvedValue({ exists: () => false });
    firebaseFirestore.setDoc.mockResolvedValue(undefined);

    const user = await authService.signInWithGoogle();

    expect(firebaseAuth.signInWithPopup).toHaveBeenCalledTimes(1);
    expect(firebaseFirestore.setDoc).toHaveBeenCalledTimes(1);
    expect(user).toEqual(mockUser);
    expect(user.uid).toBe('user-abc-123');
  });

  // ── UT02 ──────────────────────────────────────────────────────────────────
  test('UT02 — Verify that a failed Google Sign-In propagates the Firebase authentication error to the caller', async () => {
    const authError = new Error('auth/popup-closed-by-user');
    firebaseAuth.signInWithPopup.mockRejectedValue(authError);

    await expect(authService.signInWithGoogle()).rejects.toThrow(
      'auth/popup-closed-by-user',
    );
    expect(firebaseAuth.signInWithPopup).toHaveBeenCalledTimes(1);
    expect(firebaseFirestore.setDoc).not.toHaveBeenCalled();
  });

  // ── UT03 ──────────────────────────────────────────────────────────────────
  test("UT03 — Verify that a new user's Firestore profile document is written on first sign-in", async () => {
    const mockUser = {
      uid: 'user-session-456',
      email: 'bob@example.com',
      displayName: 'Bob',
      photoURL: 'https://example.com/photo.jpg',
    };

    firebaseAuth.signInWithPopup.mockResolvedValue({ user: mockUser });
    firebaseFirestore.getDoc.mockResolvedValue({ exists: () => false });
    firebaseFirestore.setDoc.mockResolvedValue(undefined);

    await authService.signInWithGoogle();

    expect(firebaseFirestore.setDoc).toHaveBeenCalledTimes(1);
    expect(firebaseFirestore.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        uid: 'user-session-456',
        email: 'bob@example.com',
        displayName: 'Bob',
      }),
    );
  });

  // ── UT04 ──────────────────────────────────────────────────────────────────
  test('UT04 — Verify that an existing user does not trigger a Firestore write on subsequent sign-in', async () => {
    const mockUser = {
      uid: 'user-existing-789',
      email: 'carol@example.com',
      displayName: 'Carol',
      photoURL: null,
    };

    firebaseAuth.signInWithPopup.mockResolvedValue({ user: mockUser });
    firebaseFirestore.getDoc.mockResolvedValue({ exists: () => true });

    await authService.signInWithGoogle();

    expect(firebaseFirestore.setDoc).not.toHaveBeenCalled();
  });

  // ── UT05 ──────────────────────────────────────────────────────────────────
  test('UT05 — Verify that the auth-state subscriber receives a non-null user object when authenticated', () => {
    const mockUser = { uid: 'user-logged-in', email: 'dave@example.com' };

    firebaseAuth.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(mockUser);
      return jest.fn();
    });

    const listener = jest.fn();
    authService.subscribeToAuthChanges(listener);

    expect(listener).toHaveBeenCalledWith(mockUser);
    expect(listener).not.toHaveBeenCalledWith(null);
  });

  // ── UT06 ──────────────────────────────────────────────────────────────────
  test('UT06 — Verify that the auth-state subscriber receives null when no user is authenticated', () => {
    firebaseAuth.onAuthStateChanged.mockImplementation((_auth, callback) => {
      callback(null);
      return jest.fn();
    });

    const listener = jest.fn();
    const unsubscribe = authService.subscribeToAuthChanges(listener);

    expect(firebaseAuth.onAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(null);
    expect(typeof unsubscribe).toBe('function');
  });
});
