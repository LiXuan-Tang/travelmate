import { updateDocument } from './firebase/firestore';
import { uploadImage } from './firebase/storage';
import { UserProfile } from '@app-types/index';
import { COLLECTIONS } from '@constants/index';

/**
 * Persists profile edits to Firestore and returns the updated profile snapshot.
 * Extracted from useEditProfile so the update logic is testable outside React.
 */
export async function updateProfile(
  profile: UserProfile,
  displayName: string,
  bio: string,
  avatarUri?: string | null,
): Promise<UserProfile> {
  let photoURL = profile.photoURL;

  if (avatarUri) {
    photoURL = await uploadImage(
      avatarUri,
      `users/${profile.uid}/avatar/profile.jpg`,
    );
  }

  await updateDocument(COLLECTIONS.USERS, profile.uid, {
    displayName: displayName.trim(),
    bio: bio.trim(),
    photoURL,
  });

  return {
    ...profile,
    displayName: displayName.trim(),
    bio: bio.trim(),
    photoURL,
  };
}
