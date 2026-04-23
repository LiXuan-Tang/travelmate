import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '@store/authStore';
import { useTripStore } from '@store/tripStore';
import { useCommunityStore } from '@store/communityStore';
import { useTrips } from '@hooks/useTrips';
import { useFeed } from '@hooks/usePosts';
import { MainTabParamList, RootStackParamList, Trip, Post } from '@app-types/index';

type HomeNav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const QUICK_ACTIONS = [
  { label: 'New Trip', icon: '✈️' },
  { label: 'Explore', icon: '🧭' },
  { label: 'AI Ideas', icon: '✨' },
  { label: 'Community', icon: '🌍' },
];

export default function HomeScreen() {
  const navigation = useNavigation<HomeNav>();
  const { profile } = useAuthStore();
  const { trips } = useTripStore();
  const { posts } = useCommunityStore();
  const firstName = profile?.displayName?.split(' ')[0] ?? 'Traveler';

  useTrips();
  const { load: loadFeed } = useFeed();

  useEffect(() => {
    loadFeed();
  }, []);

  const now = Date.now();

  const upcomingTrips = trips
    .filter((t) => {
      const end = t.endDate?.seconds ? t.endDate.seconds * 1000 : 0;
      return end >= now;
    })
    .sort((a, b) => (a.startDate?.seconds ?? 0) - (b.startDate?.seconds ?? 0))
    .slice(0, 3);

  const previewPosts = posts.slice(0, 3);

  const handleQuickAction = (label: string) => {
    switch (label) {
      case 'New Trip':
        navigation.navigate('TripForm', {});
        break;
      case 'Explore':
        navigation.navigate('Explore');
        break;
      case 'AI Ideas':
        navigation.navigate('AIIdeas');
        break;
      case 'Community':
        navigation.navigate('Community');
        break;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-5 pt-7 pb-2">
          <Text className="text-2xl font-bold text-foreground tracking-tight">
            Hello, {firstName}
          </Text>
          <Text className="text-sm text-muted-foreground mt-1">Where are you going next?</Text>
        </View>

        {/* Quick Actions */}
        <View className="px-5 mt-6">
          <View className="flex-row gap-3">
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                className="flex-1 items-center bg-primary-light rounded-2xl py-4 border border-border"
                activeOpacity={0.65}
                onPress={() => handleQuickAction(action.label)}
              >
                <Text className="text-base mb-1">{action.icon}</Text>
                <Text className="text-xs font-medium text-foreground text-center">
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Trips */}
        <View className="px-5 mt-8">
          <SectionHeader
            title="Upcoming Trips"
            onSeeAll={() => navigation.navigate('Trips')}
          />
          {upcomingTrips.length === 0 ? (
            <EmptyCard
              message="No upcoming trips yet"
              description="Create a trip to start planning."
              action="New Trip"
              onAction={() => navigation.navigate('TripForm', {})}
            />
          ) : (
            <View className="gap-3">
              {upcomingTrips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
                />
              ))}
            </View>
          )}
        </View>

        {/* From the Community */}
        <View className="px-5 mt-6">
          <SectionHeader
            title="From the Community"
            onSeeAll={() => navigation.navigate('Community')}
          />
          {previewPosts.length === 0 ? (
            <EmptyCard
              message="Nothing here yet"
              description="Discover travel stories from other explorers."
            />
          ) : (
            <View className="gap-3">
              {previewPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll: () => void }) {
  return (
    <View className="flex-row justify-between items-center mb-3">
      <Text className="text-base font-semibold text-foreground">{title}</Text>
      <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
        <Text className="text-sm font-medium text-muted-foreground">See all</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Empty Card ───────────────────────────────────────────────────────────────

function EmptyCard({
  message,
  description,
  action,
  onAction,
}: {
  message: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View className="bg-surface rounded-2xl border border-border px-5 py-6">
      <Text className="text-sm font-semibold text-foreground mb-1">{message}</Text>
      <Text className="text-xs text-muted-foreground leading-5">{description}</Text>
      {action && onAction && (
        <TouchableOpacity
          className="mt-4 self-start px-4 py-2 bg-foreground rounded-full"
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text className="text-xs font-semibold text-white">{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Trip Card ────────────────────────────────────────────────────────────────

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const startDate = trip.startDate?.seconds
    ? new Date(trip.startDate.seconds * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : '—';
  const endDate = trip.endDate?.seconds
    ? new Date(trip.endDate.seconds * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';

  const isOngoing =
    trip.startDate?.seconds &&
    trip.endDate?.seconds &&
    trip.startDate.seconds * 1000 <= Date.now() &&
    trip.endDate.seconds * 1000 >= Date.now();

  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl border border-border overflow-hidden"
      activeOpacity={0.75}
      onPress={onPress}
    >
      {trip.coverImage ? (
        <Image
          source={{ uri: trip.coverImage }}
          style={{ height: 100, width: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View className="h-1.5 bg-foreground w-full" />
      )}
      <View className="px-4 py-3">
        <View className="flex-row items-center justify-between mb-0.5">
          <Text className="text-sm font-semibold text-foreground flex-1 mr-2" numberOfLines={1}>
            {trip.title}
          </Text>
          {isOngoing && (
            <View className="bg-green-100 rounded-full px-2 py-0.5">
              <Text className="text-green-700 text-xs font-medium">Ongoing</Text>
            </View>
          )}
        </View>
        <Text className="text-xs text-muted-foreground">
          {startDate} — {endDate}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl border border-border px-4 py-4"
      activeOpacity={0.75}
      onPress={onPress}
    >
      {post.destination ? (
        <Text className="text-xs font-medium text-muted-foreground mb-1">
          📍 {post.destination}
        </Text>
      ) : null}
      <Text className="text-sm font-semibold text-foreground mb-1" numberOfLines={2}>
        {post.title}
      </Text>
      {post.body ? (
        <Text className="text-xs text-muted-foreground leading-4" numberOfLines={2}>
          {post.body}
        </Text>
      ) : null}
      <View className="flex-row items-center mt-2 gap-3">
        <Text className="text-xs text-muted-foreground">♥ {post.likesCount}</Text>
        <Text className="text-xs text-muted-foreground">💬 {post.commentsCount}</Text>
      </View>
    </TouchableOpacity>
  );
}
