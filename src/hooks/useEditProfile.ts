import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useAuthStore } from '@store/authStore';
import { updateProfile as updateProfileService } from '@services/profile';
import { validateProfileForm } from '@utils/profileValidation';

export interface EditProfileForm {
  displayName: string;
  bio: string;
}

export { ProfileFormErrors as EditProfileFormErrors } from '@utils/profileValidation';

export function useEditProfile() {
  const { profile, setProfile } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  const validate = (form: EditProfileForm) => validateProfileForm(form);

  const pickAvatar = async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to change your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setLocalAvatarUri(result.assets[0].uri);
    }
  };

  const saveProfile = async (form: EditProfileForm): Promise<boolean> => {
    if (!profile) return false;

    const errors = validate(form);
    if (Object.keys(errors).length > 0) return false;

    setSaving(true);
    try {
      const updated = await updateProfileService(
        profile,
        form.displayName,
        form.bio,
        localAvatarUri,
      );
      setProfile(updated);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save profile.';
      Alert.alert('Save Failed', message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    profile,
    saving,
    localAvatarUri,
    validate,
    pickAvatar,
    saveProfile,
  };
}
