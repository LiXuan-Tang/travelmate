/**
 * profile.test.js
 *
 * Module 2 — Profile Management
 * Covers UT07–UT18
 *
 *   UT07 — Verify that updateProfile returns an updated snapshot with the new display name and bio
 *   UT08 — Verify that a fully-populated profile form passes validation with no errors
 *   UT09 — Verify that updateProfile writes the new display name to the correct Firestore document
 *   UT10 — Verify that updateProfile trims whitespace from the display name before persisting
 *   UT11 — Verify that updateProfile writes the new bio to the correct Firestore document
 *   UT12 — Verify that updateProfile returns an updated snapshot containing the new bio value
 *   UT13 — Verify that updateProfile calls uploadImage when a new avatar URI is provided
 *   UT14 — Verify that updateProfile preserves the existing photoURL when no new avatar is provided
 *   UT15 — Verify that validateProfileForm returns an error when the display name is empty
 *   UT16 — Verify that validateProfileForm returns an error when the display name contains only whitespace
 *   UT17 — Verify that validateProfileForm returns an error when the display name exceeds 50 characters
 *   UT18 — Verify that validateProfileForm returns no errors for a valid display name at the 50-character limit
 */

// Mock the local Firestore/Storage service helpers used by profile.ts
jest.mock('../src/services/firebase/firestore', () => ({
  updateDocument: jest.fn(),
  getDocument: jest.fn(),
  createDocument: jest.fn(),
  subscribeToCollection: jest.fn(() => jest.fn()),
  where: jest.fn(),
}));

jest.mock('../src/services/firebase/storage', () => ({
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
}));

const { validateProfileForm } = require('../src/utils/profileValidation');
const profileService = require('../src/services/profile');
const firestoreHelpers = require('../src/services/firebase/firestore');
const storageHelpers = require('../src/services/firebase/storage');

/** Minimal UserProfile fixture */
const mockProfile = {
  id: 'user-001',
  uid: 'user-001',
  email: 'alice@example.com',
  displayName: 'Alice',
  photoURL: null,
  bio: 'Travel lover',
  isAdmin: false,
  createdAt: { seconds: 1700000000 },
};

describe('Profile Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── UT07 ──────────────────────────────────────────────────────────────────
  describe('UT07 — Verify that updateProfile returns an updated snapshot with the new display name and bio', () => {
    test('UT07 — Verify that updateProfile returns an updated snapshot with the new display name and bio', async () => {
      firestoreHelpers.updateDocument.mockResolvedValue(undefined);

      const updated = await profileService.updateProfile(
        mockProfile,
        'Alice Updated',
        'New bio',
      );

      expect(updated.displayName).toBe('Alice Updated');
      expect(updated.bio).toBe('New bio');
      expect(updated.uid).toBe(mockProfile.uid);
      expect(updated.email).toBe(mockProfile.email);
    });
  });

  // ── UT08 ──────────────────────────────────────────────────────────────────
  describe('UT08 — Verify that a fully-populated profile form passes validation with no errors', () => {
    test('UT08 — Verify that a fully-populated profile form passes validation with no errors', () => {
      const errors = validateProfileForm({
        displayName: 'Alice',
        bio: 'Loves travel',
      });
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  // ── UT09 ──────────────────────────────────────────────────────────────────
  describe('UT09 — Verify that updateProfile writes the new display name to the correct Firestore document', () => {
    test('UT09 — Verify that updateProfile writes the new display name to the correct Firestore document', async () => {
      firestoreHelpers.updateDocument.mockResolvedValue(undefined);

      await profileService.updateProfile(mockProfile, 'Alice Wonderland', mockProfile.bio);

      expect(firestoreHelpers.updateDocument).toHaveBeenCalledWith(
        'users',
        mockProfile.uid,
        expect.objectContaining({ displayName: 'Alice Wonderland' }),
      );
    });
  });

  // ── UT10 ──────────────────────────────────────────────────────────────────
  describe('UT10 — Verify that updateProfile trims whitespace from the display name before persisting', () => {
    test('UT10 — Verify that updateProfile trims whitespace from the display name before persisting', async () => {
      firestoreHelpers.updateDocument.mockResolvedValue(undefined);

      const updated = await profileService.updateProfile(
        mockProfile,
        '  Alice Trimmed  ',
        mockProfile.bio,
      );

      expect(updated.displayName).toBe('Alice Trimmed');
      expect(firestoreHelpers.updateDocument).toHaveBeenCalledWith(
        'users',
        mockProfile.uid,
        expect.objectContaining({ displayName: 'Alice Trimmed' }),
      );
    });
  });

  // ── UT11 ──────────────────────────────────────────────────────────────────
  describe('UT11 — Verify that updateProfile writes the new bio to the correct Firestore document', () => {
    test('UT11 — Verify that updateProfile writes the new bio to the correct Firestore document', async () => {
      firestoreHelpers.updateDocument.mockResolvedValue(undefined);

      await profileService.updateProfile(mockProfile, mockProfile.displayName, 'Foodie & explorer');

      expect(firestoreHelpers.updateDocument).toHaveBeenCalledWith(
        'users',
        mockProfile.uid,
        expect.objectContaining({ bio: 'Foodie & explorer' }),
      );
    });
  });

  // ── UT12 ──────────────────────────────────────────────────────────────────
  describe('UT12 — Verify that updateProfile returns an updated snapshot containing the new bio value', () => {
    test('UT12 — Verify that updateProfile returns an updated snapshot containing the new bio value', async () => {
      firestoreHelpers.updateDocument.mockResolvedValue(undefined);

      const updated = await profileService.updateProfile(
        mockProfile,
        mockProfile.displayName,
        'Updated bio here',
      );

      expect(updated.bio).toBe('Updated bio here');
    });
  });

  // ── UT13 ──────────────────────────────────────────────────────────────────
  describe('UT13 — Verify that updateProfile calls uploadImage when a new avatar URI is provided', () => {
    test('UT13 — Verify that updateProfile calls uploadImage when a new avatar URI is provided', async () => {
      const fakeUrl = 'https://firebasestorage.googleapis.com/v0/b/app/avatar.jpg';
      storageHelpers.uploadImage.mockResolvedValue(fakeUrl);
      firestoreHelpers.updateDocument.mockResolvedValue(undefined);

      const updated = await profileService.updateProfile(
        mockProfile,
        mockProfile.displayName,
        mockProfile.bio,
        'file:///local/photo.jpg',
      );

      expect(storageHelpers.uploadImage).toHaveBeenCalledWith(
        'file:///local/photo.jpg',
        `users/${mockProfile.uid}/avatar/profile.jpg`,
      );
      expect(updated.photoURL).toBe(fakeUrl);
    });
  });

  // ── UT14 ──────────────────────────────────────────────────────────────────
  describe('UT14 — Verify that updateProfile preserves the existing photoURL when no new avatar is provided', () => {
    test('UT14 — Verify that updateProfile preserves the existing photoURL when no new avatar is provided', async () => {
      firestoreHelpers.updateDocument.mockResolvedValue(undefined);

      const profileWithPhoto = { ...mockProfile, photoURL: 'https://existing-photo.jpg' };
      const updated = await profileService.updateProfile(
        profileWithPhoto,
        profileWithPhoto.displayName,
        profileWithPhoto.bio,
        null,
      );

      expect(storageHelpers.uploadImage).not.toHaveBeenCalled();
      expect(updated.photoURL).toBe('https://existing-photo.jpg');
    });
  });

  // ── UT15 ──────────────────────────────────────────────────────────────────
  describe('UT15–UT18 — validateProfileForm validation rules', () => {
    test('UT15 — Verify that validateProfileForm returns an error when the display name is empty', () => {
      const errors = validateProfileForm({ displayName: '', bio: 'some bio' });
      expect(errors.displayName).toBe('Display name is required.');
    });

    // ── UT16 ────────────────────────────────────────────────────────────────
    test('UT16 — Verify that validateProfileForm returns an error when the display name contains only whitespace', () => {
      const errors = validateProfileForm({ displayName: '   ', bio: '' });
      expect(errors.displayName).toBe('Display name is required.');
    });

    // ── UT17 ────────────────────────────────────────────────────────────────
    test('UT17 — Verify that validateProfileForm returns an error when the display name exceeds 50 characters', () => {
      const longName = 'A'.repeat(51);
      const errors = validateProfileForm({ displayName: longName, bio: '' });
      expect(errors.displayName).toBe('Display name must be 50 characters or less.');
    });

    // ── UT18 ────────────────────────────────────────────────────────────────
    test('UT18 — Verify that validateProfileForm returns no errors for a valid display name at the 50-character limit', () => {
      const maxName = 'A'.repeat(50);
      const errors = validateProfileForm({ displayName: maxName, bio: '' });
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });
});
