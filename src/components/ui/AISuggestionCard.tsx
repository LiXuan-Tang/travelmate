import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { AISuggestion } from '@app-types/index';
import { Badge } from './Badge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍽️',
  restaurant: '🍽️',
  museum: '🏛️',
  nature: '🌿',
  park: '🌳',
  beach: '🏖️',
  landmark: '🗺️',
  shopping: '🛍️',
  entertainment: '🎭',
  adventure: '🧗',
  culture: '🎨',
  history: '🏰',
  nightlife: '🌃',
  sport: '⚽',
};

function getCategoryEmoji(category: string): string {
  const key = category.toLowerCase();
  for (const [k, emoji] of Object.entries(CATEGORY_EMOJI)) {
    if (key.includes(k)) return emoji;
  }
  return '📍';
}

function getCategoryVariant(
  category: string,
): 'default' | 'secondary' | 'success' | 'outline' {
  const key = category.toLowerCase();
  if (key.includes('food') || key.includes('restaurant')) return 'success';
  if (key.includes('museum') || key.includes('history') || key.includes('culture')) return 'default';
  if (key.includes('nature') || key.includes('park') || key.includes('beach')) return 'success';
  return 'secondary';
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AISuggestionCardProps {
  suggestion: AISuggestion;
  onAddToItinerary: (suggestion: AISuggestion) => void;
  isAdding?: boolean;
  photoUrl?: string;
}

export function AISuggestionCard({
  suggestion,
  onAddToItinerary,
  isAdding = false,
  photoUrl,
}: AISuggestionCardProps) {
  const emoji = getCategoryEmoji(suggestion.category);
  const badgeVariant = getCategoryVariant(suggestion.category);
  const [imgError, setImgError] = useState(false);

  const showPhoto = !!photoUrl && !imgError;

  return (
    <View className="bg-surface border border-border rounded-2xl mb-3 overflow-hidden">
      {/* Cover image / emoji banner */}
      {showPhoto ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: '100%', height: 148 }}
          resizeMode="cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <View className="w-full h-24 bg-primary-light items-center justify-center">
          <Text style={{ fontSize: 40 }}>{emoji}</Text>
        </View>
      )}

      {/* Name + category badge */}
      <View className="flex-row items-start px-4 pt-3 pb-2">
        <View className="flex-1">
          <Text className="text-sm font-bold text-foreground leading-snug" numberOfLines={2}>
            {suggestion.name}
          </Text>
          <View className="mt-1">
            <Badge variant={badgeVariant}>{suggestion.category}</Badge>
          </View>
        </View>
      </View>

      {/* Description */}
      <View className="px-4 pb-2">
        <Text className="text-xs text-muted-foreground leading-5" numberOfLines={3}>
          {suggestion.description}
        </Text>
      </View>

      {/* Reason chip */}
      <View className="mx-4 mb-3 bg-primary-light rounded-xl px-3 py-2">
        <Text className="text-xs font-medium text-primary leading-4">
          ✦ {suggestion.reason}
        </Text>
      </View>

      {/* Meta row: bestTime + estimatedTime */}
      <View className="flex-row px-4 pb-3 gap-3">
        {suggestion.bestTime ? (
          <View className="flex-row items-center">
            <Text className="text-xs text-muted-foreground">🕐 {suggestion.bestTime}</Text>
          </View>
        ) : null}
        {suggestion.estimatedTime ? (
          <View className="flex-row items-center">
            <Text className="text-xs text-muted-foreground">⏱ {suggestion.estimatedTime}</Text>
          </View>
        ) : null}
      </View>

      {/* Divider + action button */}
      <View className="border-t border-border">
        <TouchableOpacity
          onPress={() => onAddToItinerary(suggestion)}
          disabled={isAdding}
          activeOpacity={0.75}
          className="flex-row items-center justify-center py-3 px-4"
        >
          {isAdding ? (
            <ActivityIndicator size="small" color="#2563EB" />
          ) : (
            <Text className="text-sm font-semibold text-primary">+ Add to Itinerary</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
