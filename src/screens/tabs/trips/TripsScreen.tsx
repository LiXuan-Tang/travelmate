import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTripStore } from '@store/tripStore';
import { Badge } from '@components/ui';
import { Trip } from '@app-types/index';

export default function TripsScreen() {
  const { trips } = useTripStore();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 pt-7 pb-4">
        <Text className="text-2xl font-bold text-foreground tracking-tight">My Trips</Text>
        <TouchableOpacity
          className="bg-foreground px-4 py-2 rounded-full"
          activeOpacity={0.8}
        >
          <Text className="text-white text-sm font-semibold">+ New Trip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TripCard trip={item} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function TripCard({ trip }: { trip: Trip }) {
  const startDate = new Date(trip.startDate.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const endDate = new Date(trip.endDate.seconds * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <TouchableOpacity
      className="bg-surface rounded-2xl border border-border mb-3 overflow-hidden"
      activeOpacity={0.7}
    >
      <View className="h-1.5 bg-foreground w-full" />
      <View className="p-4">
        <Text className="text-sm font-semibold text-foreground mb-1">{trip.title}</Text>
        <Text className="text-xs text-muted-foreground mb-3">
          {startDate} — {endDate}
        </Text>
        <Badge variant={trip.visibility === 'public' ? 'outline' : 'secondary'}>
          {trip.visibility}
        </Badge>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View className="items-center pt-20 px-8">
      <Text className="text-lg font-semibold text-foreground mb-2">No trips yet</Text>
      <Text className="text-sm text-muted-foreground text-center leading-5">
        Tap "+ New Trip" to start planning your next adventure.
      </Text>
    </View>
  );
}
