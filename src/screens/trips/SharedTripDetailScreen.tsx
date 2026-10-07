import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { RootStackParamList, Post, Destination } from '@app-types/index';
import { getDocument } from '@services/firebase/firestore';
import { subscribeToDestinations } from '@services/firebase/destinations';
import { getPhotoUrl } from '@services/places';
import { COLLECTIONS } from '@constants/index';
import { groupDestinationsByDay, ItineraryDay } from '@utils/itinerary';

type Props = NativeStackScreenProps<RootStackParamList, 'SharedTripDetail'>;

// ─── Destination Row ──────────────────────────────────────────────────────────

function DestinationRow({ item }: { item: Destination }) {
  const photoUrl = item.photoReference ? getPhotoUrl(item.photoReference, 200) : null;
  return (
    <View className="flex-row items-center bg-surface border border-border rounded-2xl mb-2.5 overflow-hidden">
      <View className="w-14 h-14 bg-primary-light shrink-0 items-center justify-center">
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <Feather name="map-pin" size={18} color="#006a66" style={{ opacity: 0.5 }} />
        )}
      </View>
      <View className="flex-1 px-3 py-2.5">
        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={2}>
          {item.address}
        </Text>
      </View>
    </View>
  );
}

// ─── Day Section ─────────────────────────────────────────────────────────────

function DaySection({ group }: { group: ItineraryDay }) {
  return (
    <View className="mb-5">
      <View className="flex-row items-center gap-x-2 mb-3">
        <View className="w-7 h-7 rounded-full bg-primary items-center justify-center">
          <Text className="text-white text-xs font-bold">{group.day}</Text>
        </View>
        <Text className="text-sm font-bold text-foreground">Day {group.day}</Text>
        <View className="flex-1 h-px bg-border ml-1" />
      </View>
      {group.items.map((d) => (
        <DestinationRow key={d.id} item={d} />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SharedTripDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;

  const [post, setPost] = useState<Post | null>(null);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Fetch the shared post
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    getDocument<Post>(COLLECTIONS.POSTS, postId).then((doc) => {
      if (cancelled) return;
      if (!doc || doc.type !== 'shared_itinerary') {
        setNotFound(true);
      } else {
        setPost(doc);
      }
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [postId]);

  // Subscribe to destinations once we have the tripId
  useEffect(() => {
    if (!post?.tripId) return;
    const unsub = subscribeToDestinations(post.tripId, setDestinations);
    return unsub;
  }, [post?.tripId]);

  const itineraryDays = useMemo(
    () => groupDestinationsByDay(destinations),
    [destinations],
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#006a66" />
        <Text className="text-sm text-muted-foreground mt-3">Loading trip…</Text>
      </SafeAreaView>
    );
  }

  if (notFound || !post) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
        <Text style={{ fontSize: 48, marginBottom: 16 }}>😕</Text>
        <Text className="text-lg font-bold text-foreground mb-2 text-center">Trip Not Found</Text>
        <Text className="text-sm text-muted-foreground text-center mb-6">
          This shared trip may have been removed or the link is invalid.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')}
          activeOpacity={0.75}
          className="bg-primary rounded-full px-8 py-3"
        >
          <Text className="text-white font-semibold text-sm">Go Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Hero image */}
        <View style={{ height: 260 }} className="bg-primary-light relative">
          {post.images && post.images.length > 0 ? (
            <Image
              source={{ uri: post.images[0] }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Feather name="map" size={56} color="#006a66" style={{ opacity: 0.3 }} />
            </View>
          )}

          {/* Back button */}
          <View className="absolute top-0 left-0 right-0 flex-row justify-between items-center px-4 pt-14">
            <TouchableOpacity
              className="bg-black/40 rounded-full w-9 h-9 items-center justify-center"
              onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Main')}
              activeOpacity={0.7}
            >
              <Text className="text-white font-bold text-base">←</Text>
            </TouchableOpacity>
          </View>

          {/* Badge */}
          <View className="absolute bottom-4 left-4 bg-emerald-500 rounded-full px-3 py-1.5 flex-row items-center gap-x-1.5">
            <Text style={{ fontSize: 12 }}>🗺️</Text>
            <Text className="text-white text-xs font-bold">Shared Itinerary</Text>
          </View>

          {/* Duration pill */}
          {!!post.tripDuration && (
            <View className="absolute bottom-4 right-4 bg-black/50 rounded-full px-3 py-1">
              <Text className="text-white text-xs font-semibold">{post.tripDuration}</Text>
            </View>
          )}
        </View>

        <View className="px-5 pt-5">
          {/* Title */}
          <Text className="text-2xl font-bold text-foreground mb-3">{post.title}</Text>

          {/* Stats row */}
          <View className="flex-row gap-x-3 mb-5">
            {post.destinationCount !== undefined && (
              <View className="flex-1 bg-primary-light rounded-xl p-3 items-center">
                <Text className="text-lg font-bold text-primary">{post.destinationCount}</Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  {post.destinationCount === 1 ? 'Destination' : 'Destinations'}
                </Text>
              </View>
            )}
            {!!post.tripDuration && (
              <View className="flex-1 bg-primary-light rounded-xl p-3 items-center">
                <Text className="text-lg font-bold text-primary">{post.tripDuration}</Text>
                <Text className="text-xs text-muted-foreground mt-0.5">Duration</Text>
              </View>
            )}
            {itineraryDays.length > 0 && (
              <View className="flex-1 bg-primary-light rounded-xl p-3 items-center">
                <Text className="text-lg font-bold text-primary">{itineraryDays.length}</Text>
                <Text className="text-xs text-muted-foreground mt-0.5">
                  {itineraryDays.length === 1 ? 'Day' : 'Days'}
                </Text>
              </View>
            )}
          </View>

          {/* Caption */}
          {!!post.body && (
            <View className="bg-muted rounded-2xl p-4 mb-5">
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                About this trip
              </Text>
              <Text className="text-sm text-foreground leading-6">{post.body}</Text>
            </View>
          )}

          {/* Itinerary — grouped by day */}
          <View className="mb-6">
            <Text className="text-base font-bold text-foreground mb-4">Itinerary</Text>
            {itineraryDays.length > 0 ? (
              itineraryDays.map((group) => (
                <DaySection key={group.day} group={group} />
              ))
            ) : (
              <View className="border border-dashed border-border rounded-2xl p-5 items-center bg-primary-light/40">
                <Feather name="map-pin" size={24} color="#006a66" style={{ opacity: 0.4, marginBottom: 8 }} />
                <Text className="text-xs text-muted-foreground text-center">
                  No destinations listed for this trip.
                </Text>
              </View>
            )}
          </View>

          {/* CTA */}
          <View className="bg-surface border border-border rounded-2xl p-5 items-center">
            <Text className="text-sm font-bold text-foreground mb-1">Like this itinerary?</Text>
            <Text className="text-xs text-muted-foreground text-center mb-4">
              Sign in to TravelMate to save it, comment, and plan your own trips.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Main')}
              activeOpacity={0.75}
              className="bg-primary rounded-full px-8 py-3 w-full items-center"
            >
              <Text className="text-white font-semibold text-sm">Open TravelMate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
