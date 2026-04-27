import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList, Destination } from '@app-types/index';
import { useTripStore } from '@store/tripStore';
import { useTrips } from '@hooks/useTrips';
import { useDestinations } from '@hooks/useDestinations';
import { Badge, Button } from '@components/ui';
import { getPhotoUrl } from '@services/places';

type Props = NativeStackScreenProps<RootStackParamList, 'TripDetail'>;

const formatDate = (seconds: number) =>
  new Date(seconds * 1000).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

const getTripDuration = (startSeconds: number, endSeconds: number) => {
  const diff = endSeconds - startSeconds;
  const days = Math.ceil(diff / 86400) + 1;
  return days === 1 ? '1 day' : `${days} days`;
};

const VISIBILITY_BADGE: Record<string, 'outline' | 'secondary' | 'success'> = {
  public: 'outline',
  shared: 'success',
  private: 'secondary',
};

function DestinationCard({
  item,
  onRemove,
}: {
  item: Destination;
  onRemove: (id: string) => void;
}) {
  const photoUrl = item.photoReference ? getPhotoUrl(item.photoReference, 200) : null;

  return (
    <View className="flex-row items-center bg-surface border border-border rounded-2xl mb-3 overflow-hidden">
      {/* Thumbnail */}
      <View className="w-20 h-20 bg-primary-light shrink-0">
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Feather name="map-pin" size={24} color="#6366f1" />
          </View>
        )}
      </View>

      {/* Info */}
      <View className="flex-1 px-3 py-2.5">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={2}>
          {item.address}
        </Text>
      </View>

      {/* Remove button */}
      <TouchableOpacity
        onPress={() => onRemove(item.id)}
        activeOpacity={0.7}
        className="px-3 py-3"
      >
        <Text className="text-xl text-muted-foreground">×</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TripDetailScreen({ route, navigation }: Props) {
  const { tripId } = route.params;
  const trip = useTripStore((s) => s.trips.find((t) => t.id === tripId));
  const { deleteTrip, isLoading } = useTrips({ subscribe: false });
  const { destinations, removeDestination } = useDestinations(tripId);

  const handleEdit = useCallback(() => {
    navigation.navigate('TripForm', { tripId });
  }, [navigation, tripId]);

  const handleAddDestination = useCallback(() => {
    navigation.navigate('DestinationSearch', { tripId });
  }, [navigation, tripId]);

  const handleRemoveDestination = useCallback(
    (destId: string) => {
      Alert.alert('Remove Destination', 'Remove this destination from your trip?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeDestination(destId),
        },
      ]);
    },
    [removeDestination],
  );

  const tripDatesString = useMemo(() => {
    if (!trip?.startDate?.seconds) return '';
    const start = new Date(trip.startDate.seconds * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const end = trip.endDate?.seconds
      ? new Date(trip.endDate.seconds * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : start;
    return `${start} – ${end}`;
  }, [trip]);

  const aiDestinationName = useMemo(
    () => trip?.title ?? destinations[0]?.name ?? 'the destination',
    [destinations, trip],
  );

  const handleAISuggestions = useCallback(() => {
    navigation.navigate('AIRecommendations', {
      tripId,
      destination: aiDestinationName,
      tripDates: tripDatesString,
      preferences: [],
    });
  }, [navigation, tripId, aiDestinationName, tripDatesString]);

  const handleAIChat = useCallback(() => {
    navigation.navigate('AIChat', {
      tripId,
      destination: aiDestinationName,
      tripDates: tripDatesString,
      preferences: [],
    });
  }, [navigation, tripId, aiDestinationName, tripDatesString]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${trip?.title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteTrip(tripId, trip?.coverImage);
            if (success) navigation.goBack();
          },
        },
      ],
    );
  }, [trip, tripId, deleteTrip, navigation]);

  if (!trip) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-base text-muted-foreground">Trip not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-sm font-semibold text-primary">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const duration =
    trip.startDate?.seconds && trip.endDate?.seconds
      ? getTripDuration(trip.startDate.seconds, trip.endDate.seconds)
      : '—';
  const badgeVariant = VISIBILITY_BADGE[trip.visibility] ?? 'secondary';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero Image */}
        <View style={{ height: 280 }} className="bg-primary-light relative">
          {trip.coverImage ? (
            <Image
              source={{ uri: trip.coverImage }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Feather name="map" size={56} color="#6366f1" style={{ opacity: 0.4 }} />
            </View>
          )}

          {/* Back + Edit buttons overlaid on image */}
          <View className="absolute top-0 left-0 right-0 flex-row justify-between items-center px-4 pt-14">
            <TouchableOpacity
              className="bg-black/40 rounded-full w-9 h-9 items-center justify-center"
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text className="text-white font-bold text-base">←</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="bg-black/40 rounded-full px-4 py-1.5"
              onPress={handleEdit}
              activeOpacity={0.7}
            >
              <Text className="text-white text-xs font-semibold">Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Duration pill */}
          <View className="absolute bottom-4 right-4 bg-black/50 rounded-full px-3 py-1">
            <Text className="text-white text-xs font-semibold">{duration}</Text>
          </View>
        </View>

        {/* Trip Info */}
        <View className="px-5 pt-5">
          <View className="flex-row items-start justify-between mb-3">
            <Text className="text-2xl font-bold text-foreground flex-1 mr-3">{trip.title}</Text>
            <Badge variant={badgeVariant}>{trip.visibility}</Badge>
          </View>

          {/* Date Range */}
          <View className="bg-muted rounded-2xl p-4 mb-4">
            <View className="flex-row items-center mb-3">
              <View className="w-2 h-2 rounded-full bg-primary mr-3" />
              <View>
                <Text className="text-xs text-muted-foreground mb-0.5">Departure</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {trip.startDate?.seconds ? formatDate(trip.startDate.seconds) : '—'}
                </Text>
              </View>
            </View>
            <View className="w-px h-4 bg-border ml-1 mb-3" />
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full border-2 border-primary mr-3" />
              <View>
                <Text className="text-xs text-muted-foreground mb-0.5">Return</Text>
                <Text className="text-sm font-semibold text-foreground">
                  {trip.endDate?.seconds ? formatDate(trip.endDate.seconds) : '—'}
                </Text>
              </View>
            </View>
          </View>

          {/* Stats Row */}
          <View className="flex-row gap-x-3 mb-6">
            <View className="flex-1 bg-primary-light rounded-xl p-4 items-center">
              <Text className="text-xl font-bold text-primary">{duration}</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">Duration</Text>
            </View>
            <View className="flex-1 bg-primary-light rounded-xl p-4 items-center">
              <Text className="text-xl font-bold text-primary">
                {trip.collaborators.length}
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                {trip.collaborators.length === 1 ? 'Collaborator' : 'Collaborators'}
              </Text>
            </View>
            <View className="flex-1 bg-primary-light rounded-xl p-4 items-center">
              <Text className="text-xl font-bold text-primary">{destinations.length}</Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                {destinations.length === 1 ? 'Destination' : 'Destinations'}
              </Text>
            </View>
          </View>

          {/* Destinations section */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-base font-bold text-foreground">Destinations</Text>
              <View className="flex-row gap-x-2">
                {destinations.length > 0 && (
                  <TouchableOpacity
                    onPress={() => navigation.navigate('Itinerary', { tripId })}
                    activeOpacity={0.7}
                    className="flex-row items-center border border-primary rounded-full px-3 py-1.5"
                  >
                    <Text className="text-primary text-xs font-semibold">Itinerary</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={handleAddDestination}
                  activeOpacity={0.7}
                  className="flex-row items-center bg-primary rounded-full px-3 py-1.5"
                >
                  <Text className="text-white text-xs font-semibold">+ Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {destinations.length > 0 ? (
              <FlatList
                data={destinations}
                keyExtractor={(d) => d.id}
                renderItem={({ item }) => (
                  <DestinationCard item={item} onRemove={handleRemoveDestination} />
                )}
                scrollEnabled={false}
              />
            ) : (
              <View className="border border-dashed border-border rounded-2xl p-6 items-center bg-primary-light/40">
                <Feather name="map-pin" size={28} color="#6366f1" style={{ marginBottom: 8, opacity: 0.6 }} />
                <Text className="text-sm font-semibold text-foreground mb-1">
                  No destinations yet
                </Text>
                <Text className="text-xs text-muted-foreground text-center leading-4 mb-4">
                  Search for places to add to your trip itinerary.
                </Text>
                <Button size="sm" onPress={handleAddDestination}>
                  Add Destination
                </Button>
              </View>
            )}
          </View>

          {/* AI Features */}
          <View className="mb-6">
            <Text className="text-base font-bold text-foreground mb-3">AI Assistant</Text>

            <TouchableOpacity
              onPress={handleAISuggestions}
              activeOpacity={0.8}
              className="bg-primary rounded-2xl px-4 py-3 flex-row items-center mb-3"
            >
              <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center mr-3">
                <Feather name="cpu" size={16} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-white">AI Suggestions</Text>
                <Text className="text-xs text-white/70 mt-0.5">Places curated for you</Text>
              </View>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleAIChat}
              activeOpacity={0.8}
              className="bg-surface border border-border rounded-2xl px-4 py-3 flex-row items-center"
            >
              <View className="w-8 h-8 rounded-full bg-primary-light items-center justify-center mr-3">
                <Feather name="message-circle" size={16} color="#6366f1" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-foreground">Ask AI Assistant</Text>
                <Text className="text-xs text-muted-foreground mt-0.5">Chat about your trip</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          {/* Delete button */}
          <Button variant="destructive" onPress={handleDelete} loading={isLoading} size="lg">
            Delete Trip
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
