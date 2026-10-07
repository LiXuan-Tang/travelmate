import React from 'react';
import { View, Text, TouchableOpacity, Alert, Image, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@store/authStore';
import { logoutUser } from '@services/firebase/auth';
import { Separator } from '@components/ui';
import { RootStackParamList } from '@app-types/index';

type Nav = NativeStackNavigationProp<RootStackParamList>;

type MenuItem = {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress?: () => void;
  destructive?: boolean;
};

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuthStore();
  const initial = (profile?.displayName?.[0] ?? '?').toUpperCase();

  const handleLogout = async () => {
    const confirmed =
      Platform.OS === 'web'
        ? typeof window !== 'undefined' && window.confirm('Sign out from TravelMate?')
        : await new Promise<boolean>((resolve) => {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: () => resolve(true),
              },
            ]);
          });

    if (!confirmed) return;

    try {
      await logoutUser();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not sign out';
      if (Platform.OS === 'web') window.alert(message);
      else Alert.alert('Sign Out Failed', message);
    }
  };

  const menuItems: MenuItem[] = [
    {
      label: 'Edit Profile',
      icon: 'person-outline',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      label: 'About TravelMate',
      icon: 'information-circle-outline',
      onPress: () => navigation.navigate('AboutTravelMate'),
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-5 pt-7 pb-2">
          <Text className="text-2xl font-bold text-foreground tracking-tight">Profile</Text>
        </View>

        {/* Avatar + identity */}
        <View className="items-center py-8">
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.85}
            className="relative mb-4"
          >
            {profile?.photoURL ? (
              <Image
                source={{ uri: profile.photoURL }}
                style={{ width: 80, height: 80, borderRadius: 40 }}
                resizeMode="cover"
              />
            ) : (
              <View className="w-20 h-20 rounded-full bg-primary items-center justify-center">
                <Text className="text-2xl font-bold text-white">{initial}</Text>
              </View>
            )}
            {/* Edit badge */}
            <View className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-secondary border-2 border-background items-center justify-center">
              <Ionicons name="pencil" size={10} color="#fff" />
            </View>
          </TouchableOpacity>

          <Text className="text-base font-semibold text-foreground">
            {profile?.displayName ?? 'Traveler'}
          </Text>
          <Text className="text-sm text-muted-foreground mt-0.5">{profile?.email ?? ''}</Text>

          {!!profile?.bio && (
            <Text className="text-sm text-foreground mt-3 text-center px-10 leading-5">
              {profile.bio}
            </Text>
          )}
        </View>

        {/* Menu */}
        <View className="mx-5 bg-surface rounded-2xl border border-border overflow-hidden">
          {menuItems.map((item, index) => (
            <React.Fragment key={item.label}>
              <TouchableOpacity
                className="flex-row items-center px-5 py-4"
                activeOpacity={0.55}
                onPress={item.onPress}
              >
                <View className="w-8 h-8 rounded-xl bg-primary-light items-center justify-center mr-3">
                  <Ionicons
                    name={item.icon}
                    size={17}
                    color={item.destructive ? '#EF4444' : '#006a66'}
                  />
                </View>
                <Text
                  className={`flex-1 text-sm font-medium ${item.destructive ? 'text-destructive' : 'text-foreground'}`}
                >
                  {item.label}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#d4cdb8" />
              </TouchableOpacity>
              {index < menuItems.length - 1 && <Separator className="mx-5" />}
            </React.Fragment>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          className="mx-5 mt-3 bg-surface rounded-2xl border border-border py-4 items-center flex-row justify-center"
          activeOpacity={0.65}
          onPress={handleLogout}
          style={{ gap: 8 }}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text className="text-sm font-semibold text-destructive">Sign Out</Text>
        </TouchableOpacity>

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
