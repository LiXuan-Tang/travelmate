import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList } from '@app-types/index';
import HomeScreen from '@screens/tabs/home/HomeScreen';
import TripsScreen from '@screens/tabs/trips/TripsScreen';
import ExploreScreen from '@screens/tabs/explore/ExploreScreen';
import CommunityScreen from '@screens/tabs/community/CommunityScreen';
import ProfileScreen from '@screens/tabs/profile/ProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { outline: IoniconName; filled: IoniconName }> = {
  Home: { outline: 'home-outline', filled: 'home' },
  Trips: { outline: 'airplane-outline', filled: 'airplane' },
  Explore: { outline: 'compass-outline', filled: 'compass' },
  Community: { outline: 'people-outline', filled: 'people' },
  Profile: { outline: 'person-outline', filled: 'person' },
};

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, size }) => {
          const icons = TAB_ICONS[route.name];
          const iconName = focused ? icons.filled : icons.outline;
          return (
            <Ionicons
              name={iconName}
              size={size ?? 22}
              color={focused ? '#006a66' : '#9ca3af'}
            />
          );
        },
        tabBarActiveTintColor: '#006a66',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#d4cdb8',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 6,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Trips" component={TripsScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
