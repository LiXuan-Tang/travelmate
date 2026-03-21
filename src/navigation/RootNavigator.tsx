import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { RootStackParamList } from '@app-types/index';
import { COLORS } from '@constants/index';
import { useAuthStore } from '@store/authStore';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import EditProfileScreen from '@screens/profile/EditProfileScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ animation: 'slide_from_right' }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
