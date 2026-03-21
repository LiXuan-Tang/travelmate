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
  DestinationSearch: { tripId: string };
  Itinerary: { tripId: string };
  PostDetail: { postId: string };
  PostForm: { postId?: string };
  AdminDashboard: undefined;
};
