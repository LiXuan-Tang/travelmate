import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Share } from 'react-native';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { useAuthStore } from '@store/authStore';
import { useCommunityStore } from '@store/communityStore';
import { uploadImage } from '@services/firebase/storage';
import {
  fetchPublicPosts,
  createPost as firestoreCreatePost,
  updatePost as firestoreUpdatePost,
  deletePost as firestoreDeletePost,
  toggleLike as firestoreToggleLike,
  toggleSaved as firestoreToggleSaved,
  addComment as firestoreAddComment,
  deleteComment as firestoreDeleteComment,
} from '@services/firebase/posts';
import { generateShareLink } from '@services/firebase/dynamicLinks';
import { Post, Trip, Destination } from '@app-types/index';
import { ShareOption } from '@components/ui';

export interface PostFormData {
  title: string;
  body: string;
  destination: string;
  tags: string[];
  visibility: 'public' | 'private';
  imageUris: string[];
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export const useFeed = () => {
  const { user, profile, setProfile } = useAuthStore();
  const { posts, setPosts, addPost, updatePost, setLoading, setError, isLoading } = useCommunityStore();

  const cursorRef = useRef<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    cursorRef.current = null;
    try {
      const { posts: fetched, lastDoc } = await fetchPublicPosts(null);
      setPosts(fetched);
      cursorRef.current = lastDoc;
      setHasMore(fetched.length === 10);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [setPosts, setLoading, setError]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursorRef.current) return;
    setIsLoadingMore(true);
    try {
      const { posts: fetched, lastDoc } = await fetchPublicPosts(cursorRef.current);
      setPosts([...posts, ...fetched]);
      cursorRef.current = lastDoc;
      setHasMore(fetched.length === 10);
    } catch {
      // non-fatal
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, posts, setPosts]);

  const likePost = useCallback(
    async (postId: string) => {
      if (!user || !profile) return;
      const isLiked = (profile.likedPostIds ?? []).includes(postId);
      // Optimistic: update liked IDs in profile and likesCount in the post
      const newIds = isLiked
        ? (profile.likedPostIds ?? []).filter((id) => id !== postId)
        : [...(profile.likedPostIds ?? []), postId];
      setProfile({ ...profile, likedPostIds: newIds });
      const currentPost = posts.find((p) => p.id === postId);
      const currentCount = currentPost?.likesCount ?? 0;
      updatePost(postId, { likesCount: isLiked ? Math.max(0, currentCount - 1) : currentCount + 1 });
      try {
        await firestoreToggleLike(postId, user.uid, isLiked);
      } catch (e) {
        // Revert both profile and post count on failure
        setProfile(profile);
        updatePost(postId, { likesCount: currentCount });
      }
    },
    [user, profile, setProfile, posts, updatePost],
  );

  const savePost = useCallback(
    async (postId: string) => {
      if (!user || !profile) return;
      const isSaved = (profile.savedPostIds ?? []).includes(postId);
      const newIds = isSaved
        ? (profile.savedPostIds ?? []).filter((id) => id !== postId)
        : [...(profile.savedPostIds ?? []), postId];
      setProfile({ ...profile, savedPostIds: newIds });
      try {
        await firestoreToggleSaved(postId, user.uid, isSaved);
      } catch {
        setProfile(profile);
      }
    },
    [user, profile, setProfile],
  );

  return {
    posts,
    isLoading,
    hasMore,
    isLoadingMore,
    load,
    loadMore,
    likePost,
    savePost,
    likedPostIds: profile?.likedPostIds ?? [],
    savedPostIds: profile?.savedPostIds ?? [],
  };
};

// ─── Post CRUD ────────────────────────────────────────────────────────────────

export const usePostActions = () => {
  const { user } = useAuthStore();
  const { addPost, updatePost, removePost } = useCommunityStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImages = useCallback(async (): Promise<string[]> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return [];
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });
    if (result.canceled) return [];
    return result.assets.map((a) => a.uri);
  }, []);

  const uploadImages = useCallback(
    async (uris: string[], postId: string): Promise<string[]> => {
      if (!user) return [];
      const uploads = uris.map((uri, i) => {
        if (uri.startsWith('http')) return Promise.resolve(uri); // already uploaded
        const path = `posts/${user.uid}/${postId}/${Date.now()}_${i}.jpg`;
        return uploadImage(uri, path);
      });
      return Promise.all(uploads);
    },
    [user],
  );

  const createPost = useCallback(
    async (form: PostFormData): Promise<string | null> => {
      if (!user) return null;
      setIsLoading(true);
      setError(null);
      try {
        // Create doc first to get ID, then upload images using the ID as path prefix
        const postId = await firestoreCreatePost({
          authorId: user.uid,
          title: form.title.trim(),
          body: form.body.trim(),
          destination: form.destination.trim(),
          tags: form.tags,
          visibility: form.visibility,
          images: [],
        });
        const imageUrls = await uploadImages(form.imageUris, postId);
        if (imageUrls.length > 0) {
          await firestoreUpdatePost(postId, { images: imageUrls });
        }
        const newPost: Post = {
          id: postId,
          authorId: user.uid,
          title: form.title.trim(),
          body: form.body.trim(),
          destination: form.destination.trim(),
          tags: form.tags,
          visibility: form.visibility,
          images: imageUrls,
          likesCount: 0,
          commentsCount: 0,
          createdAt: null as never,
          updatedAt: null as never,
        };
        addPost(newPost);
        return postId;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to create post');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user, uploadImages, addPost],
  );

  const editPost = useCallback(
    async (postId: string, form: PostFormData, existingImages: string[]): Promise<boolean> => {
      if (!user) return false;
      setIsLoading(true);
      setError(null);
      try {
        // Upload any new local URIs; keep existing https URLs as-is
        const imageUrls = await uploadImages(form.imageUris, postId);
        // Delete removed images from Storage
        const removed = existingImages.filter((url) => !form.imageUris.includes(url));
        await Promise.allSettled(
          removed
            .filter((url) => url.includes('firebasestorage'))
            .map((url) => {
              const path = decodeURIComponent(url.split('/o/')[1].split('?')[0]);
              const { deleteImage } = require('@services/firebase/storage');
              return deleteImage(path);
            }),
        );
        await firestoreUpdatePost(postId, {
          title: form.title.trim(),
          body: form.body.trim(),
          destination: form.destination.trim(),
          tags: form.tags,
          visibility: form.visibility,
          images: imageUrls,
        });
        updatePost(postId, {
          title: form.title.trim(),
          body: form.body.trim(),
          destination: form.destination.trim(),
          tags: form.tags,
          visibility: form.visibility,
          images: imageUrls,
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update post');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user, uploadImages, updatePost],
  );

  const deletePost = useCallback(
    async (postId: string, images: string[]): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await firestoreDeletePost(postId, images);
        removePost(postId);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete post');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [removePost],
  );

  const shareTrip = useCallback(
    async (
      trip: Trip,
      destinations: Destination[],
      caption: string,
      option: ShareOption,
    ): Promise<string | null> => {
      if (!user) return null;
      setIsLoading(true);
      setError(null);
      try {
        const startSeconds = trip.startDate?.seconds;
        const endSeconds = trip.endDate?.seconds;
        const durationDays =
          startSeconds && endSeconds
            ? Math.ceil((endSeconds - startSeconds) / 86400) + 1
            : null;
        const tripDuration = durationDays
          ? durationDays === 1
            ? '1 day'
            : `${durationDays} days`
          : undefined;

        if (option === 'community') {
          // ── Publish to Community ─────────────────────────────────────────────
          // Creates a public post visible in the community feed.
          const postId = await firestoreCreatePost({
            authorId: user.uid,
            title: trip.title,
            body: caption,
            destination: destinations[0]?.name ?? '',
            tags: ['shared_itinerary'],
            visibility: 'public',
            images: trip.coverImage ? [trip.coverImage] : [],
            type: 'shared_itinerary',
            tripId: trip.id,
            destinationCount: destinations.length,
            tripDuration,
          });

          const newPost: Post = {
            id: postId,
            authorId: user.uid,
            title: trip.title,
            body: caption,
            destination: destinations[0]?.name ?? '',
            tags: ['shared_itinerary'],
            visibility: 'public',
            images: trip.coverImage ? [trip.coverImage] : [],
            likesCount: 0,
            commentsCount: 0,
            createdAt: null as never,
            updatedAt: null as never,
            type: 'shared_itinerary',
            tripId: trip.id,
            destinationCount: destinations.length,
            tripDuration,
          };
          // Optimistically add to community store so it appears in "My Posts"
          addPost(newPost);
          return postId;
        } else {
          // ── Generate Share Link ──────────────────────────────────────────────
          // Creates a private post (hidden from community feed) purely to
          // back the shareable URL. Does NOT push to the community store.
          const postId = await firestoreCreatePost({
            authorId: user.uid,
            title: trip.title,
            body: caption,
            destination: destinations[0]?.name ?? '',
            tags: ['shared_itinerary'],
            visibility: 'private',
            images: trip.coverImage ? [trip.coverImage] : [],
            type: 'shared_itinerary',
            tripId: trip.id,
            destinationCount: destinations.length,
            tripDuration,
          });

          const shareUrl = generateShareLink(postId);
          await Share.share({
            title: trip.title,
            url: shareUrl,
            message: `Check out my travel plan "${trip.title}" on TravelMate: ${shareUrl}`,
          });
          return postId;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to share trip');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [user, addPost],
  );

  return { isLoading, error, pickImages, createPost, editPost, deletePost, shareTrip };
};

// ─── Comments ─────────────────────────────────────────────────────────────────

export const useComments = (postId: string) => {
  const { user } = useAuthStore();
  const { updatePost } = useCommunityStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addComment = useCallback(
    async (text: string): Promise<boolean> => {
      if (!user || !text.trim()) return false;
      setIsSubmitting(true);
      try {
        await firestoreAddComment(postId, user.uid, text);
        // Optimistically bump commentsCount in the store
        const p = useCommunityStore.getState().posts.find((x) => x.id === postId);
        if (p) updatePost(postId, { commentsCount: (p.commentsCount ?? 0) + 1 });
        return true;
      } catch {
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [postId, user, updatePost],
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<void> => {
      await firestoreDeleteComment(postId, commentId);
    },
    [postId],
  );

  return { isSubmitting, addComment, deleteComment };
};
