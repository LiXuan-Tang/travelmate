import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/authStore';

const QUICK_ACTIONS = [
  { label: 'New Trip' },
  { label: 'Explore' },
  { label: 'AI Ideas' },
  { label: 'Community' },
];

export default function HomeScreen() {
  const { profile } = useAuthStore();
  const firstName = profile?.displayName?.split(' ')[0] ?? 'Traveler';

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
              >
                <Text className="text-xs font-medium text-foreground text-center">
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Upcoming Trips */}
        <View className="px-5 mt-8">
          <SectionHeader title="Upcoming Trips" />
          <EmptyCard
            message="No upcoming trips yet"
            description="Create a trip to start planning."
            action="New Trip"
          />
        </View>

        {/* From the Community */}
        <View className="px-5 mt-6">
          <SectionHeader title="From the Community" />
          <EmptyCard
            message="Nothing here yet"
            description="Discover travel stories from other explorers."
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="flex-row justify-between items-center mb-3">
      <Text className="text-base font-semibold text-foreground">{title}</Text>
      <TouchableOpacity>
        <Text className="text-sm font-medium text-muted-foreground">See all</Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyCard({
  message,
  description,
  action,
}: {
  message: string;
  description: string;
  action?: string;
}) {
  return (
    <View className="bg-surface rounded-2xl border border-border px-5 py-6">
      <Text className="text-sm font-semibold text-foreground mb-1">{message}</Text>
      <Text className="text-xs text-muted-foreground leading-5">{description}</Text>
      {action && (
        <TouchableOpacity className="mt-4 self-start px-4 py-2 bg-foreground rounded-full">
          <Text className="text-xs font-semibold text-white">{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
