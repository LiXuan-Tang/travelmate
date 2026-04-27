import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Comment, UserProfile } from '@app-types/index';
import { useAuthStore } from '@store/authStore';
import { useCommunityStore } from '@store/communityStore';
import { useFeed, useComments, usePostActions } from '@hooks/usePosts';
import { subscribeToComments } from '@services/firebase/posts';
import { getDocument } from '@services/firebase/firestore';
import { COLLECTIONS } from '@constants/index';

type Props = NativeStackScreenProps<RootStackParamList, 'PostDetail'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: { seconds: number } | null | undefined): string {
  if (!ts?.seconds) return '';
  const diff = Math.floor(Date.now() / 1000 - ts.seconds);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(ts.seconds * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Comment Row ──────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  author,
  isOwn,
  onDelete,
}: {
  comment: Comment;
  author: Pick<UserProfile, 'displayName' | 'photoURL'> | null;
  isOwn: boolean;
  onDelete: () => void;
}) {
  const initial = (author?.displayName ?? 'U').charAt(0).toUpperCase();

  const handleLongPress = useCallback(() => {
    if (!isOwn) return;
    Alert.alert('Delete Comment', 'Remove this comment?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  }, [isOwn, onDelete]);

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      activeOpacity={0.9}
      className="flex-row mb-4"
    >
      {author?.photoURL ? (
        <Image source={{ uri: author.photoURL }} className="w-8 h-8 rounded-full mr-2 shrink-0" />
      ) : (
        <View className="w-8 h-8 rounded-full bg-primary items-center justify-center mr-2 shrink-0">
          <Text className="text-white text-xs font-bold">{initial}</Text>
        </View>
      )}
      <View className="flex-1">
        <View className="flex-row items-center gap-x-1.5 mb-0.5">
          <Text className="text-xs font-semibold text-foreground">
            {author?.displayName ?? 'Traveller'}
          </Text>
          <Text className="text-xs text-muted-foreground">{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text className="text-sm text-foreground leading-5">{comment.text}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { user } = useAuthStore();
  const post = useCommunityStore((s) => s.posts.find((p) => p.id === postId));

  const { likePost, savePost, likedPostIds, savedPostIds } = useFeed();
  const { deletePost } = usePostActions();
  const { isSubmitting, addComment, deleteComment } = useComments(postId);

  const [comments, setComments] = useState<Comment[]>([]);
  const [authors, setAuthors] = useState<Record<string, UserProfile>>({});
  const [commentText, setCommentText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Real-time comments listener
  useEffect(() => {
    const unsub = subscribeToComments(postId, setComments);
    return unsub;
  }, [postId]);

  // Lazy-load author profiles
  useEffect(() => {
    if (!post) return;
    const uids = [post.authorId, ...comments.map((c) => c.authorId)];
    const missing = [...new Set(uids)].filter((uid) => uid && !authors[uid]);
    if (missing.length === 0) return;
    Promise.allSettled(
      missing.map((uid) =>
        getDocument<UserProfile>(COLLECTIONS.USERS, uid).then((profile) => {
          if (profile) setAuthors((prev) => ({ ...prev, [uid]: profile }));
        }),
      ),
    );
  }, [post, comments, authors]);

  const handleSend = useCallback(async () => {
    if (!commentText.trim() || isSubmitting) return;
    const text = commentText;
    setCommentText('');
    await addComment(text);
  }, [commentText, isSubmitting, addComment]);

  const handleDeleteComment = useCallback(
    (commentId: string) => deleteComment(commentId),
    [deleteComment],
  );

  const handleDeletePost = useCallback(() => {
    Alert.alert('Delete Post', 'This will permanently delete your post and all comments.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const ok = await deletePost(postId, post?.images ?? []);
          if (ok) navigation.goBack();
        },
      },
    ]);
  }, [postId, post, deletePost, navigation]);

  const handleOptions = useCallback(() => {
    if (!post || post.authorId !== user?.uid) return;
    Alert.alert('Post Options', undefined, [
      {
        text: 'Edit',
        onPress: () => navigation.navigate('PostForm', { postId }),
      },
      { text: 'Delete', style: 'destructive', onPress: handleDeletePost },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [post, user, postId, navigation, handleDeletePost]);

  if (!post) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-muted-foreground text-sm">Post not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-sm font-semibold text-foreground">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isLiked = likedPostIds.includes(postId);
  const isSaved = savedPostIds.includes(postId);
  const isOwner = post.authorId === user?.uid;
  const postAuthor = authors[post.authorId] ?? null;
  const authorInitial = (postAuthor?.displayName ?? 'U').charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-2 pb-3 border-b border-border">
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text className="text-base font-bold text-foreground">←</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-foreground">Post</Text>
        <View className="flex-row items-center gap-x-3">
          <TouchableOpacity onPress={() => likePost(postId)} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>{isLiked ? '❤️' : '🤍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => savePost(postId)} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>{isSaved ? '🔖' : '🏷️'}</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity onPress={handleOptions} activeOpacity={0.7}>
              <Text className="text-base text-foreground font-bold">•••</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 16 }}
        >
          {/* Images */}
          {post.images && post.images.length > 0 && (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              className="bg-muted"
              style={{ height: 280 }}
            >
              {post.images.map((uri, i) => (
                <Image
                  key={i}
                  source={{ uri }}
                  style={{ width: 393, height: 280 }}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}

          <View className="px-5 pt-4">
            {/* Author row */}
            <View className="flex-row items-center gap-x-2 mb-3">
              {postAuthor?.photoURL ? (
                <Image source={{ uri: postAuthor.photoURL }} className="w-9 h-9 rounded-full" />
              ) : (
                <View className="w-9 h-9 rounded-full bg-primary items-center justify-center">
                  <Text className="text-white text-sm font-bold">{authorInitial}</Text>
                </View>
              )}
              <View>
                <Text className="text-sm font-semibold text-foreground">
                  {postAuthor?.displayName ?? 'Traveller'}
                </Text>
                <Text className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</Text>
              </View>
              {!!post.destination && (
                <View className="ml-auto bg-primary-light rounded-full px-2.5 py-0.5 border border-primary/20">
                  <Text className="text-xs font-medium text-primary">📍 {post.destination}</Text>
                </View>
              )}
            </View>

            {/* Title + body */}
            <Text className="text-lg font-bold text-foreground mb-2">{post.title}</Text>
            {!!post.body && (
              <Text className="text-sm text-foreground leading-6 mb-3">{post.body}</Text>
            )}

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <View key={tag} className="bg-muted rounded-full px-3 py-1">
                    <Text className="text-xs text-muted-foreground">#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Stats row */}
            <View className="flex-row items-center gap-x-4 py-3 border-t border-b border-border mb-5">
              <Text className="text-xs text-muted-foreground">
                {post.likesCount ?? 0} {post.likesCount === 1 ? 'like' : 'likes'}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {post.commentsCount ?? 0} {post.commentsCount === 1 ? 'comment' : 'comments'}
              </Text>
            </View>

            {/* Comments */}
            <Text className="text-sm font-bold text-foreground mb-4">Comments</Text>
            {comments.length === 0 ? (
              <Text className="text-xs text-muted-foreground mb-4">
                No comments yet. Be the first to reply!
              </Text>
            ) : (
              comments.map((c) => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  author={authors[c.authorId] ?? null}
                  isOwn={c.authorId === user?.uid}
                  onDelete={() => handleDeleteComment(c.id)}
                />
              ))
            )}
          </View>
        </ScrollView>

        {/* Comment input */}
        <View className="flex-row items-end px-4 py-3 border-t border-border bg-surface gap-x-2">
          <TextInput
            className="flex-1 bg-muted rounded-2xl px-4 py-3 text-sm text-foreground"
            placeholder="Add a comment…"
            placeholderTextColor="#9CA3AF"
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
            style={{ maxHeight: 100 }}
            returnKeyType="send"
            blurOnSubmit
            onSubmitEditing={handleSend}
            editable={!isSubmitting}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={isSubmitting || !commentText.trim()}
            activeOpacity={0.75}
            className={`w-10 h-10 rounded-full items-center justify-center ${
              isSubmitting || !commentText.trim() ? 'bg-muted' : 'bg-primary'
            }`}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#006a66" />
            ) : (
              <Text className="text-white font-bold" style={{ fontSize: 16 }}>↑</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
