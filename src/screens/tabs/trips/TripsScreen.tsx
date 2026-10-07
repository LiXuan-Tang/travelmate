import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Animated,
  PanResponder,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTripStore } from '@store/tripStore';
import { useTrips } from '@hooks/useTrips';
import { Trip, RootStackParamList } from '@app-types/index';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SWIPE_THRESHOLD = 80;
const DELETE_ZONE_WIDTH = 80;

export default function TripsScreen() {
  const navigation = useNavigation<Nav>();
  const { trips, isLoading } = useTripStore();
  useTrips(); // subscribe to real-time updates

  const handleNewTrip = useCallback(() => {
    navigation.navigate('TripForm', {});
  }, [navigation]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 pt-7 pb-4">
        <Text className="text-2xl font-bold text-foreground tracking-tight">My Trips</Text>
        <TouchableOpacity
          className="bg-primary px-4 py-2 rounded-full"
          activeOpacity={0.8}
          onPress={handleNewTrip}
        >
          <Text className="text-white text-sm font-semibold">+ New Trip</Text>
        </TouchableOpacity>
      </View>

      {isLoading && trips.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#006a66" />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SwipeableTripCard trip={item} navigation={navigation} />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
          ListEmptyComponent={<EmptyState onNewTrip={handleNewTrip} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ─── SwipeableTripCard ────────────────────────────────────────────────────────

function SwipeableTripCard({ trip, navigation }: { trip: Trip; navigation: Nav }) {
  const translateX = useRef(new Animated.Value(0)).current;
  const { deleteTrip } = useTrips({ subscribe: false });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 6 && Math.abs(gestureState.dy) < 12,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          translateX.setValue(Math.max(gestureState.dx, -DELETE_ZONE_WIDTH - 20));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          Animated.spring(translateX, {
            toValue: -DELETE_ZONE_WIDTH,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const snapBack = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  const handleDelete = useCallback(() => {
    snapBack();
    Alert.alert(
      'Delete Trip',
      `Delete "${trip.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel', onPress: snapBack },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTrip(trip.id, trip.coverImage),
        },
      ],
    );
  }, [trip, deleteTrip, snapBack]);

  const handlePress = useCallback(() => {
    navigation.navigate('TripDetail', { tripId: trip.id });
  }, [navigation, trip.id]);

  // Hide delete tray when closed — otherwise web hover/press dimming on TouchableOpacity
  // lets the destructive strip show through on the right.
  const deleteZoneOpacity = translateX.interpolate({
    inputRange: [-DELETE_ZONE_WIDTH - 20, -6, 0],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  const startDate = trip.startDate?.seconds
    ? new Date(trip.startDate.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';
  const endDate = trip.endDate?.seconds
    ? new Date(trip.endDate.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

  return (
    <View className="mb-3 overflow-hidden rounded-2xl">
      {/* Delete zone revealed when swiped */}
      <Animated.View
        className="absolute right-0 top-0 bottom-0 z-0 bg-destructive items-center justify-center"
        style={{ width: DELETE_ZONE_WIDTH, opacity: deleteZoneOpacity }}
      >
        <TouchableOpacity
          onPress={handleDelete}
          activeOpacity={0.8}
          className="items-center justify-center w-full h-full"
        >
          <Text className="text-white text-xl">🗑️</Text>
          <Text className="text-white text-xs font-medium mt-1">Delete</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Card (slides over the delete zone) */}
      <Animated.View
        className="w-full z-[1]"
        style={{ transform: [{ translateX }] }}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          className="w-full bg-surface border border-border rounded-2xl overflow-hidden"
          activeOpacity={0.7}
          onPress={handlePress}
        >
          {/* Cover image strip or color bar */}
          {trip.coverImage ? (
            <Image
              source={{ uri: trip.coverImage }}
              style={{ height: 120, width: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View className="h-1.5 bg-primary w-full" />
          )}

          <View className="p-4">
            <View className="mb-1">
              <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                {trip.title}
              </Text>
            </View>
            <Text className="text-xs text-muted-foreground">
              {startDate} — {endDate}
            </Text>
            {trip.collaborators.length > 0 && (
              <Text className="text-xs text-muted-foreground mt-1">
                {trip.collaborators.length}{' '}
                {trip.collaborators.length === 1 ? 'collaborator' : 'collaborators'}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({ onNewTrip }: { onNewTrip: () => void }) {
  return (
    <View className="items-center pt-20 px-8">
      <Text style={{ fontSize: 52 }} className="mb-4">✈️</Text>
      <Text className="text-lg font-semibold text-foreground mb-2">No trips yet</Text>
      <Text className="text-sm text-muted-foreground text-center leading-5 mb-6">
        Start planning your next adventure by creating your first trip.
      </Text>
      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-full"
        activeOpacity={0.8}
        onPress={onNewTrip}
      >
        <Text className="text-white text-sm font-semibold">+ Create First Trip</Text>
      </TouchableOpacity>
    </View>
  );
}
