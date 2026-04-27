import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Post, UserProfile } from '@app-types/index';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_IMAGE_HEIGHT = 220;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts?.seconds) return '';
  const diff = Math.floor(Date.now() / 1000 - ts.seconds);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Image Carousel ───────────────────────────────────────────────────────────

function ImageCarousel({ images, title }: { images: string[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidth = SCREEN_WIDTH - 32;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    setActiveIndex(idx);
  };

  if (images.length === 0) {
    return (
      <View
        style={{ height: CARD_IMAGE_HEIGHT }}
        className="bg-primary-light items-center justify-center"
      >
        <Text className="text-4xl font-bold text-primary opacity-40">
          {title.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ height: CARD_IMAGE_HEIGHT }}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ width: cardWidth, height: CARD_IMAGE_HEIGHT }}
            resizeMode="cover"
          />
        )}
      />
      {images.length > 1 && (
        <View className="absolute bottom-2 left-0 right-0 flex-row justify-center gap-x-1">
          {images.map((_, i) => (
            <View
              key={i}
              style={{ width: i === activeIndex ? 16 : 6, height: 4 }}
              className={`rounded-full ${i === activeIndex ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

export interface PostCardProps {
  post: Post;
  author: Pick<UserProfile, 'displayName' | 'photoURL'> | null;
  isLiked: boolean;
  isSaved: boolean;
  onPress: () => void;
  onLike: () => void;
  onSave: () => void;
  onComment: () => void;
}

export function PostCard({
  post,
  author,
  isLiked,
  isSaved,
  onPress,
  onLike,
  onSave,
  onComment,
}: PostCardProps) {
  const authorInitial = (author?.displayName ?? 'U').charAt(0).toUpperCase();

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      className="bg-surface border border-border rounded-2xl mb-4 overflow-hidden"
    >
      {/* Image carousel */}
      <ImageCarousel images={post.images ?? []} title={post.title} />

      {/* Author row */}
      <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
        <View className="flex-row items-center gap-x-2">
          {author?.photoURL ? (
            <Image
              source={{ uri: author.photoURL }}
              className="w-7 h-7 rounded-full"
            />
          ) : (
            <View className="w-7 h-7 rounded-full bg-primary items-center justify-center">
              <Text className="text-white text-xs font-bold">{authorInitial}</Text>
            </View>
          )}
          <Text className="text-xs font-semibold text-foreground">
            {author?.displayName ?? 'Traveller'}
          </Text>
          {!!post.createdAt && (
            <Text className="text-xs text-muted-foreground">· {timeAgo(post.createdAt)}</Text>
          )}
        </View>

        {!!post.destination && (
          <View className="bg-primary-light rounded-full px-2.5 py-0.5 border border-primary/20">
            <Text className="text-xs font-medium text-primary" numberOfLines={1}>
              📍 {post.destination}
            </Text>
          </View>
        )}
      </View>

      {/* Title + body */}
      <View className="px-4 pb-2">
        <Text className="text-sm font-bold text-foreground mb-0.5" numberOfLines={2}>
          {post.title}
        </Text>
        {!!post.body && (
          <Text className="text-xs text-muted-foreground leading-5" numberOfLines={3}>
            {post.body}
          </Text>
        )}
      </View>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View className="flex-row flex-wrap px-4 pb-2 gap-1">
          {post.tags.slice(0, 4).map((tag) => (
            <View key={tag} className="bg-muted rounded-full px-2.5 py-0.5">
              <Text className="text-xs text-muted-foreground">#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Action row */}
      <View className="flex-row items-center px-4 py-2.5 border-t border-border gap-x-4">
        <TouchableOpacity
          onPress={onLike}
          activeOpacity={0.7}
          className="flex-row items-center gap-x-1"
        >
          <Text style={{ fontSize: 16 }}>{isLiked ? '❤️' : '🤍'}</Text>
          <Text className="text-xs text-muted-foreground font-medium">
            {post.likesCount ?? 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onComment}
          activeOpacity={0.7}
          className="flex-row items-center gap-x-1"
        >
          <Text style={{ fontSize: 16 }}>💬</Text>
          <Text className="text-xs text-muted-foreground font-medium">
            {post.commentsCount ?? 0}
          </Text>
        </TouchableOpacity>

        <View className="flex-1" />

        <TouchableOpacity onPress={onSave} activeOpacity={0.7}>
          <Text style={{ fontSize: 16 }}>{isSaved ? '🔖' : '🏷️'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
