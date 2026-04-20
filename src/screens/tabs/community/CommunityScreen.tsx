import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, Post, UserProfile } from '@app-types/index';
import { useAuthStore } from '@store/authStore';
import { useCommunityStore } from '@store/communityStore';
import { useFeed, usePostActions } from '@hooks/usePosts';
import { subscribeToUserPosts } from '@services/firebase/posts';
import { getDocument } from '@services/firebase/firestore';
import { COLLECTIONS } from '@constants/index';
import { PostCard } from '@components/ui';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type FeedTab = 'all' | 'mine' | 'saved';

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS: { key: FeedTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'My Posts' },
  { key: 'saved', label: 'Saved' },
];

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab, onPost }: { tab: FeedTab; onPost: () => void }) {
  const msgs: Record<FeedTab, { icon: string; title: string; sub: string; cta?: string }> = {
    all: {
      icon: '🌍',
      title: 'No travel stories yet',
      sub: 'Be the first to share your experience with the community.',
      cta: 'Write a Post',
    },
    mine: {
      icon: '✍️',
      title: 'You haven\'t posted yet',
      sub: 'Share your travel memories and inspire others.',
      cta: 'Write a Post',
    },
    saved: {
      icon: '🔖',
      title: 'No saved posts',
      sub: 'Tap 🏷️ on any post to save it here for later.',
    },
  };
  const { icon, title, sub, cta } = msgs[tab];

  return (
    <View className="items-center pt-20 px-8">
      <Text style={{ fontSize: 40 }} className="mb-3">{icon}</Text>
      <Text className="text-base font-semibold text-foreground mb-1 text-center">{title}</Text>
      <Text className="text-sm text-muted-foreground text-center leading-5 mb-5">{sub}</Text>
      {cta && (
        <TouchableOpacity
          onPress={onPost}
          activeOpacity={0.75}
          className="bg-primary rounded-2xl px-6 py-3"
        >
          <Text className="text-sm font-semibold text-white">{cta}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const navigation = useNavigation<NavProp>();
  const { user } = useAuthStore();
  const { posts: publicPosts } = useCommunityStore();
  const { isLoading, isLoadingMore, hasMore, load, loadMore, likePost, savePost, likedPostIds, savedPostIds } =
    useFeed();

  const [tab, setTab] = useState<FeedTab>('all');
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [authors, setAuthors] = useState<Record<string, UserProfile>>({});
  const authorsFetching = useRef<Set<string>>(new Set());

  // Load public feed on mount
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to own posts
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToUserPosts(user.uid, setMyPosts);
    return unsub;
  }, [user]);

  // Resolve author profiles (lazy, cached)
  const fetchAuthor = useCallback(
    async (uid: string) => {
      if (authors[uid] || authorsFetching.current.has(uid)) return;
      authorsFetching.current.add(uid);
      const profile = await getDocument<UserProfile>(COLLECTIONS.USERS, uid);
      if (profile) setAuthors((prev) => ({ ...prev, [uid]: profile }));
    },
    [authors],
  );

  const displayedPosts = useMemo<Post[]>(() => {
    if (tab === 'mine') return myPosts;
    if (tab === 'saved') return publicPosts.filter((p) => savedPostIds.includes(p.id));
    return publicPosts;
  }, [tab, publicPosts, myPosts, savedPostIds]);

  const handleNavigateToPost = useCallback(
    (postId: string) => navigation.navigate('PostDetail', { postId }),
    [navigation],
  );

  const handleNavigateToForm = useCallback(
    () => navigation.navigate('PostForm', {}),
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Post }) => {
      // Lazy fetch author when the card appears
      fetchAuthor(item.authorId);
      return (
        <PostCard
          post={item}
          author={authors[item.authorId] ?? null}
          isLiked={likedPostIds.includes(item.id)}
          isSaved={savedPostIds.includes(item.id)}
          onPress={() => handleNavigateToPost(item.id)}
          onLike={() => likePost(item.id)}
          onSave={() => savePost(item.id)}
          onComment={() => handleNavigateToPost(item.id)}
        />
      );
    },
    [authors, likedPostIds, savedPostIds, fetchAuthor, handleNavigateToPost, likePost, savePost],
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 pt-4 pb-3">
        <View>
          <Text className="text-2xl font-bold text-foreground tracking-tight">Community</Text>
          <Text className="text-sm text-muted-foreground mt-0.5">Travel stories & diaries</Text>
        </View>
        <TouchableOpacity
          onPress={handleNavigateToForm}
          activeOpacity={0.8}
          className="bg-foreground px-4 py-2 rounded-full"
        >
          <Text className="text-white text-sm font-semibold">+ Post</Text>
        </TouchableOpacity>
      </View>

      {/* Tab selector */}
      <View className="border-b border-border">
        <View className="flex-row px-5 gap-x-1">
          {TABS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setTab(key)}
              activeOpacity={0.75}
              className={`px-4 py-2.5 border-b-2 ${
                tab === key ? 'border-foreground' : 'border-transparent'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  tab === key ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Initial loading */}
      {isLoading && displayedPosts.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : (
        <FlatList
          data={displayedPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          onEndReached={tab === 'all' ? loadMore : undefined}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && displayedPosts.length > 0}
              onRefresh={load}
              tintColor="#2563EB"
            />
          }
          ListEmptyComponent={
            <EmptyState tab={tab} onPost={handleNavigateToForm} />
          }
          ListFooterComponent={
            tab === 'all' && isLoadingMore ? (
              <View className="py-4 items-center">
                <ActivityIndicator size="small" color="#2563EB" />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
