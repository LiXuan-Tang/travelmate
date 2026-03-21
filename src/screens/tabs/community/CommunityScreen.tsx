import React from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCommunityStore } from '@store/communityStore';

export default function CommunityScreen() {
  const { posts } = useCommunityStore();

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 pt-7 pb-4">
        <View>
          <Text className="text-2xl font-bold text-foreground tracking-tight">Community</Text>
          <Text className="text-sm text-muted-foreground mt-0.5">Travel stories & diaries</Text>
        </View>
        <TouchableOpacity
          className="bg-foreground px-4 py-2 rounded-full"
          activeOpacity={0.8}
        >
          <Text className="text-white text-sm font-semibold">+ Post</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={() => null}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function EmptyState() {
  return (
    <View className="items-center pt-20 px-8">
      <Text className="text-lg font-semibold text-foreground mb-2">No travel diaries yet</Text>
      <Text className="text-sm text-muted-foreground text-center leading-5">
        Be the first to share your travel story with the community.
      </Text>
    </View>
  );
}
