import { create } from 'zustand';
import { Post } from '@app-types/index';

interface CommunityState {
  posts: Post[];
  activePost: Post | null;
  savedPostIds: string[];
  isLoading: boolean;
  error: string | null;
  setPosts: (posts: Post[]) => void;
  setActivePost: (post: Post | null) => void;
  setSavedPostIds: (ids: string[]) => void;
  addPost: (post: Post) => void;
  updatePost: (id: string, data: Partial<Post>) => void;
  removePost: (id: string) => void;
  toggleSaved: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useCommunityStore = create<CommunityState>((set) => ({
  posts: [],
  activePost: null,
  savedPostIds: [],
  isLoading: false,
  error: null,
  setPosts: (posts) => set({ posts }),
  setActivePost: (activePost) => set({ activePost }),
  setSavedPostIds: (savedPostIds) => set({ savedPostIds }),
  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),
  updatePost: (id, data) =>
    set((state) => ({
      posts: state.posts.map((p) => (p.id === id ? { ...p, ...data } : p)),
    })),
  removePost: (id) => set((state) => ({ posts: state.posts.filter((p) => p.id !== id) })),
  toggleSaved: (id) =>
    set((state) => ({
      savedPostIds: state.savedPostIds.includes(id)
        ? state.savedPostIds.filter((s) => s !== id)
        : [...state.savedPostIds, id],
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
