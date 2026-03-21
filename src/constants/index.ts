// ─── Colors ───────────────────────────────────────────────────────────────────

export const COLORS = {
  primary: '#2563EB',      // Blue 600
  primaryDark: '#1D4ED8',  // Blue 700
  primaryLight: '#DBEAFE', // Blue 100
  secondary: '#10B981',    // Emerald 500
  accent: '#F59E0B',       // Amber 500
  background: '#F9FAFB',   // Gray 50
  surface: '#FFFFFF',
  text: '#111827',         // Gray 900
  textSecondary: '#6B7280',// Gray 500
  border: '#E5E7EB',       // Gray 200
  error: '#EF4444',        // Red 500
  success: '#22C55E',      // Green 500
  warning: '#F59E0B',
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const FONT_SIZE = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
} as const;

export const FONT_WEIGHT = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// ─── Spacing ──────────────────────────────────────────────────────────────────

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

// ─── Border Radius ────────────────────────────────────────────────────────────

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// ─── Firestore Collections ────────────────────────────────────────────────────

export const COLLECTIONS = {
  USERS: 'users',
  TRIPS: 'trips',
  DESTINATIONS: 'destinations',
  POSTS: 'posts',
  COMMENTS: 'comments',
  LIKES: 'likes',
  SAVED_POSTS: 'savedPosts',
  NOTIFICATIONS: 'notifications',
  REPORTS: 'reports',
} as const;
