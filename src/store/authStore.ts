import { create } from 'zustand';
import { User } from 'firebase/auth';
import { UserProfile } from '@app-types/index';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  error: null,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ user: null, profile: null, isLoading: false, error: null }),
}));
