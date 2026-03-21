import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '@app-types/index';
import { Input } from '@components/ui';
import { useEditProfile, EditProfileForm, EditProfileFormErrors } from '@hooks/useEditProfile';

type Nav = NativeStackNavigationProp<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, saving, localAvatarUri, validate, pickAvatar, saveProfile } = useEditProfile();

  const [form, setForm] = useState<EditProfileForm>({
    displayName: profile?.displayName ?? '',
    bio: profile?.bio ?? '',
  });
  const [errors, setErrors] = useState<EditProfileFormErrors>({});

  const avatarSource = localAvatarUri
    ? { uri: localAvatarUri }
    : profile?.photoURL
      ? { uri: profile.photoURL }
      : null;

  const initial = (profile?.displayName?.[0] ?? '?').toUpperCase();

  const handleFieldChange = (field: keyof EditProfileForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof EditProfileFormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSave = async () => {
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    const success = await saveProfile(form);
    if (success) {
      navigation.goBack();
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-border">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-9 h-9 items-center justify-center"
            activeOpacity={0.65}
          >
            <Ionicons name="chevron-back" size={22} color="#0A0A0A" />
          </TouchableOpacity>

          <Text className="text-base font-semibold text-foreground">Edit Profile</Text>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="px-4 py-1.5 bg-primary rounded-xl"
            activeOpacity={0.75}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-sm font-semibold text-white">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar picker */}
          <View className="items-center pt-8 pb-6">
            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}>
              <View className="relative">
                {avatarSource ? (
                  <Image
                    source={avatarSource}
                    style={{ width: 96, height: 96, borderRadius: 48 }}
                    resizeMode="cover"
                  />
                ) : (
                  <View className="w-24 h-24 rounded-full bg-foreground items-center justify-center">
                    <Text className="text-3xl font-bold text-white">{initial}</Text>
                  </View>
                )}
                <View className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary border-2 border-background items-center justify-center">
                  <Ionicons name="camera" size={14} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7} className="mt-3">
              <Text className="text-sm font-medium text-primary">Change photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form fields */}
          <View className="px-5" style={{ gap: 20 }}>
            {/* Read-only email */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-1.5">Email</Text>
              <View className="flex-row items-center bg-muted border border-border rounded-xl px-4 py-3 opacity-60">
                <Ionicons name="lock-closed-outline" size={15} color="#737373" style={{ marginRight: 8 }} />
                <Text className="text-base text-muted-foreground flex-1">{profile?.email ?? ''}</Text>
              </View>
              <Text className="text-xs text-muted-foreground mt-1">
                Email is managed by your Google account.
              </Text>
            </View>

            <Input
              label="Display Name"
              value={form.displayName}
              onChangeText={(v) => handleFieldChange('displayName', v)}
              placeholder="Your name"
              maxLength={50}
              error={errors.displayName}
              autoCorrect={false}
            />

            {/* Bio — custom multiline field */}
            <View>
              <Text className="text-sm font-medium text-foreground mb-1.5">Bio</Text>
              <View className="bg-muted border border-border rounded-xl px-4 pt-3 pb-2">
                <TextInput
                  value={form.bio}
                  onChangeText={(v) => handleFieldChange('bio', v)}
                  placeholder="Tell others about yourself…"
                  placeholderTextColor="#A1A1AA"
                  multiline
                  maxLength={200}
                  style={{ minHeight: 90, fontSize: 16, color: '#0A0A0A', textAlignVertical: 'top' }}
                />
              </View>
              <Text className="text-xs text-muted-foreground mt-1 text-right">
                {form.bio.length}/200
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
