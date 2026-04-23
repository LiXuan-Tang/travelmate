import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { RootStackParamList } from '@app-types/index';
import { COLORS } from '@constants/index';
import { useAuthStore } from '@store/authStore';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import EditProfileScreen from '@screens/profile/EditProfileScreen';
import TripDetailScreen from '@screens/trips/TripDetailScreen';
import TripFormScreen from '@screens/trips/TripFormScreen';
import DestinationSearchScreen from '@screens/trips/DestinationSearchScreen';
import ItineraryScreen from '@screens/trips/ItineraryScreen';
import AIRecommendationsScreen from '@screens/trips/AIRecommendationsScreen';
import AIChatScreen from '@screens/trips/AIChatScreen';
import AIIdeasScreen from '@screens/trips/AIIdeasScreen';
import PostDetailScreen from '@screens/trips/PostDetailScreen';
import PostFormScreen from '@screens/trips/PostFormScreen';

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
          <Stack.Screen
            name="TripDetail"
            component={TripDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="TripForm"
            component={TripFormScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="DestinationSearch"
            component={DestinationSearchScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Itinerary"
            component={ItineraryScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="AIRecommendations"
            component={AIRecommendationsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="AIChat"
            component={AIChatScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="AIIdeas"
            component={AIIdeasScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
          <Stack.Screen
            name="PostDetail"
            component={PostDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="PostForm"
            component={PostFormScreen}
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
}
