import { Timestamp } from 'firebase/firestore';

// ─── User ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  bio: string;
  isAdmin: boolean;
  likedPostIds?: string[];
  savedPostIds?: string[];
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ─── Trip ────────────────────────────────────────────────────────────────────

export type TripVisibility = 'private' | 'shared' | 'public';

export interface Trip {
  id: string;
  title: string;
  coverImage: string | null;
  startDate: Timestamp;
  endDate: Timestamp;
  ownerId: string;
  collaborators: string[];
  visibility: TripVisibility;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ─── Destination ─────────────────────────────────────────────────────────────

export interface Destination {
  id: string;
  tripId: string;
  placeId: string;
  name: string;
  address: string;
  photoReference: string | null;
  lat: number;
  lng: number;
  date: Timestamp;
  notes: string;
  order: number;
  createdAt: Timestamp;
}

// ─── Community Post ───────────────────────────────────────────────────────────

export interface Post {
  id: string;
  authorId: string;
  title: string;
  body: string;
  images: string[];
  destination: string;
  tags: string[];
  likesCount: number;
  commentsCount: number;
  visibility: 'public' | 'private';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  text: string;
  createdAt: Timestamp;
}

// ─── AI Recommendations ───────────────────────────────────────────────────────

export interface AISuggestion {
  name: string;
  description: string;
  reason: string;
  category: string;
  estimatedTime: string;
  bestTime: string;
  lat: number;
  lng: number;
}

export interface DayPlanActivity {
  time: 'morning' | 'afternoon' | 'evening' | string;
  name: string;
  description: string;
  estimatedTime: string;
}

export interface DayPlan {
  day: number;
  activities: DayPlanActivity[];
}

export interface OptimizedDay {
  day: number;
  places: { name: string }[];
}

export interface OptimizedTrip {
  days: OptimizedDay[];
}

export interface BestDaySuggestion {
  bestDay: number;
  reason: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Trips: undefined;
  Explore: undefined;
  Community: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  EditProfile: undefined;
  TripDetail: { tripId: string };
  TripForm: { tripId?: string };
  DestinationSearch: { tripId: string; targetDate?: string };
  Itinerary: { tripId: string };
  PostDetail: { postId: string };
  PostForm: { postId?: string };
  AdminDashboard: undefined;
  AIRecommendations: {
    tripId: string;
    destination: string;
    tripDates: string;
    preferences: string[];
  };
  AIChat: {
    tripId: string;
    destination: string;
    tripDates: string;
    preferences: string[];
  };
  AIIdeas: undefined;
};
