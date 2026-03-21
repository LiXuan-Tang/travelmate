import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const CATEGORIES = ['Beaches', 'Mountains', 'Cities', 'Nature', 'Culture', 'Food'];

export default function ExploreScreen() {
  const [query, setQuery] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="px-5 pt-7 pb-4">
        <Text className="text-2xl font-bold text-foreground tracking-tight">Explore</Text>
        <Text className="text-sm text-muted-foreground mt-1">Search destinations worldwide</Text>
      </View>

      {/* Search bar — icon allowed here */}
      <View className="px-5 mb-6">
        <View className="flex-row items-center bg-primary-light border border-border rounded-xl px-4">
          <Ionicons name="search-outline" size={18} color="#737373" />
          <TextInput
            className="flex-1 text-sm text-foreground py-3 ml-2.5"
            placeholder="Search places, cities, landmarks…"
            placeholderTextColor="#A3A3A3"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Category chips */}
      <View className="px-5 mb-8">
        <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
          Browse by category
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {CATEGORIES.map((label) => (
            <TouchableOpacity
              key={label}
              className="bg-surface border border-border rounded-full px-4 py-2"
              activeOpacity={0.65}
            >
              <Text className="text-xs font-medium text-foreground">{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Coming soon */}
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-base font-semibold text-foreground mb-2">Full search coming soon</Text>
        <Text className="text-sm text-muted-foreground text-center leading-5">
          Google Places integration will be available in the next update.
        </Text>
      </View>
    </SafeAreaView>
  );
}
