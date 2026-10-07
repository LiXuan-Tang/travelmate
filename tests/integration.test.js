/**
 * integration.test.js
 *
 * Integration Testing Suite — TravelMate
 * Covers IT01–IT10
 *
 * Each test validates a complete end-to-end data flow that crosses
 * at least two connected layers:
 *   service → Firebase mock/backend call → Zustand store → returned output
 *
 *   IT01 — User Sign In → Firebase Auth callback → Profile Loaded In Store
 *   IT02 — Create New Trip → Firestore write → Trip Store Updated
 *   IT03 — Create Trip → Add Destination → Firestore itinerary readback success
 *   IT04 — Existing Trip Context → Firebase Cloud Function generateDayPlan invoked
 *   IT05 — AI Day Plan Activities → Saved Into Firestore Itinerary → itinerary grouped result updated
 *   IT06 — Publish Shared Itinerary → Firestore community shared post write → fetchPublicPosts detects new post
 *   IT07 — Save Community Post → Firestore user savedPostIds updated → profile state reflects saved item
 *   IT08 — Edit Profile → Firestore profile update → new author info used in created community post
 *   IT09 — Delete Trip → Firestore delete invoked → trip store cleared → itinerary subscription empty
 *   IT10 — AI Chat Request → Firebase callable invoked with existing trip/dayplan context
 */

// ── Platform: force web so auth service uses signInWithPopup ──────────────────
jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (spec) => spec.web ?? spec.default },
}));

// ── Firebase Auth (direct SDK — used by src/services/firebase/auth.ts) ────────
jest.mock('firebase/auth', () => ({
  GoogleAuthProvider: jest.fn().mockReturnValue({ providerId: 'google.com' }),
  signInWithPopup: jest.fn(),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

// ── Firebase Firestore (direct SDK — used by src/services/firebase/posts.ts) ──
const mockBatch = {
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
};

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({ id: 'auto-id', ref: {} })),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn((...args) => args),
  where: jest.fn((...args) => args),
  orderBy: jest.fn((...args) => args),
  limit: jest.fn((...args) => args),
  startAfter: jest.fn((...args) => args),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  writeBatch: jest.fn(() => mockBatch),
  increment: jest.fn((n) => ({ _increment: n })),
  arrayUnion: jest.fn((v) => ({ _arrayUnion: v })),
  arrayRemove: jest.fn((v) => ({ _arrayRemove: v })),
}));

// ── Firestore helper layer (used by trips.ts / destinations.ts / profile.ts) ──
jest.mock('../src/services/firebase/firestore', () => ({
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
  getDocument: jest.fn(),
  subscribeToCollection: jest.fn(() => jest.fn()),
  where: jest.fn((...args) => args),
  orderBy: jest.fn((...args) => args),
}));

// ── Firebase Storage helper (used by profile.ts / posts.ts) ──────────────────
jest.mock('../src/services/firebase/storage', () => ({
  uploadImage: jest.fn(),
  deleteImage: jest.fn().mockResolvedValue(undefined),
}));

// ── Firebase Functions (used by src/services/ai.ts) ───────────────────────────
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));

// ── Service imports ───────────────────────────────────────────────────────────
const authService     = require('../src/services/firebase/auth');
const tripService     = require('../src/services/firebase/trips');
const destService     = require('../src/services/firebase/destinations');
const profileService  = require('../src/services/profile');
const postService     = require('../src/services/firebase/posts');
const shareService    = require('../src/services/share');
const aiService       = require('../src/services/ai');
const { groupDestinationsByDay } = require('../src/utils/itinerary');

// ── Mock handle imports ───────────────────────────────────────────────────────
const firebaseAuth     = require('firebase/auth');
const firestore        = require('firebase/firestore');
const firestoreHelpers = require('../src/services/firebase/firestore');
const storageHelpers   = require('../src/services/firebase/storage');
const { httpsCallable } = require('firebase/functions');

// ── Shared fixtures ───────────────────────────────────────────────────────────
const BASE_S = 1_700_000_000;

const makeTrip = (overrides = {}) => ({
  id: 'trip-fixture',
  title: 'Fixture Trip',
  ownerId: 'user-001',
  collaborators: [],
  visibility: 'private',
  coverImage: null,
  startDate: { seconds: BASE_S },
  endDate:   { seconds: BASE_S + 259200 },
  createdAt: { seconds: BASE_S },
  updatedAt: { seconds: BASE_S },
  ...overrides,
});

const makeDestination = (overrides = {}) => ({
  id: 'dest-fixture',
  tripId: 'trip-fixture',
  placeId: 'place-fixture',
  name: 'Fixture Place',
  address: '1 Main Street',
  lat: 35.68,
  lng: 139.69,
  photoReference: null,
  notes: '',
  order: 0,
  date: { seconds: BASE_S },
  createdAt: { seconds: BASE_S },
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────

describe('Integration Testing Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBatch.commit.mockResolvedValue(undefined);
  });

  // ── IT01 ──────────────────────────────────────────────────────────────────
  test('IT01 — User Sign In → Firebase Auth callback → Profile Loaded In Store', async () => {
    const mockUser = {
      uid: 'user-001',
      email: 'alice@example.com',
      displayName: 'Alice',
      photoURL: null,
    };

    // Layer 1: Firebase Auth — signInWithPopup returns authenticated user
    firebaseAuth.signInWithPopup.mockResolvedValue({ user: mockUser });

    // Layer 2: Firestore — new user doc written (getDoc says user does not exist yet)
    firestore.getDoc.mockResolvedValue({ exists: () => false });
    firestore.setDoc.mockResolvedValue(undefined);

    // Layer 3: Auth-state subscription fires with authenticated user
    firebaseAuth.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(mockUser);
      return jest.fn();
    });

    // Execute sign-in — crosses Firebase Auth + Firestore layers
    const returnedUser = await authService.signInWithGoogle();

    // Simulate what the app's auth listener hook would do: push user + profile into store
    const { useAuthStore } = require('../src/store/authStore');
    useAuthStore.getState().setUser(returnedUser);
    useAuthStore.getState().setProfile({
      id: returnedUser.uid,
      uid: returnedUser.uid,
      email: returnedUser.email,
      displayName: returnedUser.displayName,
      photoURL: returnedUser.photoURL,
      bio: '',
      isAdmin: false,
      createdAt: { seconds: BASE_S },
      savedPostIds: [],
    });

    // Assert Layer 1: Firebase Auth signInWithPopup was called
    expect(firebaseAuth.signInWithPopup).toHaveBeenCalledTimes(1);

    // Assert Layer 2: Firestore profile document created for new user
    expect(firestore.setDoc).toHaveBeenCalledTimes(1);
    expect(firestore.setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ uid: 'user-001', email: 'alice@example.com' }),
    );

    // Assert Layer 3: Auth-state subscription delivers the correct user
    const authListener = jest.fn();
    authService.subscribeToAuthChanges(authListener);
    expect(firebaseAuth.onAuthStateChanged).toHaveBeenCalledTimes(1);
    expect(authListener).toHaveBeenCalledWith(mockUser);

    // Assert Layer 4: Zustand auth store reflects authenticated state
    const { user, profile } = useAuthStore.getState();
    expect(user).not.toBeNull();
    expect(user.uid).toBe('user-001');
    expect(profile).not.toBeNull();
    expect(profile.displayName).toBe('Alice');
    expect(profile.email).toBe('alice@example.com');
  });

  // ── IT02 ──────────────────────────────────────────────────────────────────
  test('IT02 — Create New Trip → Firestore write → Trip Store Updated', async () => {
    const { useTripStore } = require('../src/store/tripStore');
    useTripStore.setState({ trips: [] });

    const tripPayload = {
      ownerId: 'user-001',
      title: 'Kyoto Adventure',
      collaborators: [],
      visibility: 'private',
      coverImage: null,
      startDate: { seconds: 1_710_000_000 },
      endDate:   { seconds: 1_710_259_200 },
    };

    // Layer 1: createTrip → Firestore createDocument
    firestoreHelpers.createDocument.mockResolvedValue('trip-int-002');
    const tripId = await tripService.createTrip(tripPayload);

    // Layer 2: Simulate real-time subscription delivering new trip into store
    const newTrip = makeTrip({
      id: tripId,
      title: 'Kyoto Adventure',
      startDate: tripPayload.startDate,
      endDate:   tripPayload.endDate,
    });
    useTripStore.getState().addTrip(newTrip);

    // Assert Layer 1: Firestore createDocument called with correct collection + payload
    expect(firestoreHelpers.createDocument).toHaveBeenCalledTimes(1);
    expect(firestoreHelpers.createDocument).toHaveBeenCalledWith(
      'trips',
      expect.objectContaining({ title: 'Kyoto Adventure', ownerId: 'user-001' }),
    );
    expect(tripId).toBe('trip-int-002');

    // Assert Layer 2: Trip store reflects the newly created trip
    const { trips } = useTripStore.getState();
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe('trip-int-002');
    expect(trips[0].title).toBe('Kyoto Adventure');
    expect(trips[0].ownerId).toBe('user-001');
  });

  // ── IT03 ──────────────────────────────────────────────────────────────────
  test('IT03 — Create Trip → Add Destination → Firestore itinerary readback success', async () => {
    const { useTripStore } = require('../src/store/tripStore');
    useTripStore.setState({ trips: [], destinations: [] });

    // Layer 1: createTrip → first Firestore write
    // Layer 2: addDestination → second Firestore write (sub-collection)
    firestoreHelpers.createDocument
      .mockResolvedValueOnce('trip-int-003')
      .mockResolvedValueOnce('dest-int-003');

    const tripId = await tripService.createTrip({
      ownerId: 'user-001',
      title: 'Seoul Trip',
      collaborators: [],
      visibility: 'private',
      coverImage: null,
      startDate: { seconds: 1_720_000_000 },
      endDate:   { seconds: 1_720_259_200 },
    });

    const destId = await destService.addDestination(tripId, {
      tripId,
      placeId: 'place-gyeongbokgung',
      name: 'Gyeongbokgung Palace',
      address: 'Sejong-daero, Seoul',
      lat: 37.5796,
      lng: 126.9770,
      photoReference: null,
      notes: 'Visit early morning',
      order: 0,
      date: { seconds: 1_720_000_000 },
    });

    // Layer 3: subscribeToDestinations delivers data → store update
    const persistedDest = makeDestination({
      id: destId,
      tripId,
      placeId: 'place-gyeongbokgung',
      name: 'Gyeongbokgung Palace',
      notes: 'Visit early morning',
      date: { seconds: 1_720_000_000 },
      createdAt: { seconds: 1_720_000_000 },
    });
    useTripStore.getState().setDestinations([persistedDest]);

    // Layer 4: groupDestinationsByDay processes the store data
    const grouped = groupDestinationsByDay(useTripStore.getState().destinations);

    // Assert Layer 1: Trip written to correct Firestore collection
    expect(firestoreHelpers.createDocument).toHaveBeenNthCalledWith(
      1,
      'trips',
      expect.objectContaining({ title: 'Seoul Trip' }),
    );
    // Assert Layer 2: Destination written to sub-collection path
    expect(firestoreHelpers.createDocument).toHaveBeenNthCalledWith(
      2,
      `trips/${tripId}/destinations`,
      expect.objectContaining({ name: 'Gyeongbokgung Palace', placeId: 'place-gyeongbokgung' }),
    );
    expect(firestoreHelpers.createDocument).toHaveBeenCalledTimes(2);

    // Assert Layer 3: Store contains the persisted destination
    expect(useTripStore.getState().destinations).toHaveLength(1);
    expect(useTripStore.getState().destinations[0].name).toBe('Gyeongbokgung Palace');

    // Assert Layer 4: Itinerary correctly grouped into Day 1
    expect(grouped).toHaveLength(1);
    expect(grouped[0].day).toBe(1);
    expect(grouped[0].items[0].name).toBe('Gyeongbokgung Palace');
  });

  // ── IT04 ──────────────────────────────────────────────────────────────────
  test('IT04 — Existing Trip Context → Firebase Cloud Function generateDayPlan invoked', async () => {
    const { useTripStore } = require('../src/store/tripStore');

    // Layer 1: Seed store with an active trip and existing destinations
    const activeTrip = makeTrip({ id: 'trip-int-004', title: 'Tokyo Explorer' });
    useTripStore.setState({
      activeTrip,
      destinations: [
        makeDestination({
          id: 'd-int-004',
          tripId: 'trip-int-004',
          name: 'Senso-ji Temple',
        }),
      ],
    });

    // Layer 2: Firebase Cloud Function generateDayPlan invoked with trip context
    const mockDayPlan = {
      day: 1,
      activities: [
        { time: 'morning',   name: 'Senso-ji Temple', description: 'Historic temple',     estimatedTime: '2 hours' },
        { time: 'afternoon', name: 'Akihabara',       description: 'Electronics district', estimatedTime: '3 hours' },
      ],
    };
    httpsCallable.mockReturnValue(jest.fn().mockResolvedValue({ data: mockDayPlan }));

    const existingPlaces = useTripStore.getState().destinations.map((d) => d.name);
    const tripContext    = useTripStore.getState().activeTrip;

    const dayPlan = await aiService.generateDayPlan({
      destination:  tripContext.title,
      tripDates:    `${tripContext.startDate.seconds} to ${tripContext.endDate.seconds}`,
      dayNumber:    1,
      preferences:  ['culture', 'food'],
      existingPlan: existingPlaces,
    });

    // Assert Layer 1: Correct context was derived from store before the call
    expect(existingPlaces).toContain('Senso-ji Temple');
    expect(tripContext.id).toBe('trip-int-004');

    // Assert Layer 2: httpsCallable routed to the correct Cloud Function
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'generateDayPlan');

    // Assert the callable received existingPlan from store context
    const callableInstance = httpsCallable.mock.results[0].value;
    expect(callableInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        destination:  'Tokyo Explorer',
        existingPlan: ['Senso-ji Temple'],
        preferences:  ['culture', 'food'],
      }),
    );

    // Assert result: complete DayPlan shape returned
    expect(dayPlan.day).toBe(1);
    expect(dayPlan.activities).toHaveLength(2);
    expect(dayPlan.activities[0].name).toBe('Senso-ji Temple');
    expect(dayPlan.activities[1].name).toBe('Akihabara');
  });

  // ── IT05 ──────────────────────────────────────────────────────────────────
  test('IT05 — AI Day Plan Activities → Saved Into Firestore Itinerary → itinerary grouped result updated', async () => {
    const { useTripStore } = require('../src/store/tripStore');
    useTripStore.setState({ destinations: [] });

    // Layer 1: Cloud Function returns AI-generated day plan
    const mockDayPlan = {
      day: 1,
      activities: [
        { time: 'morning',   name: 'Meiji Shrine', description: 'Shinto shrine',     estimatedTime: '1.5 hours' },
        { time: 'afternoon', name: 'Harajuku',     description: 'Fashion district',  estimatedTime: '2 hours'   },
      ],
    };
    httpsCallable.mockReturnValue(jest.fn().mockResolvedValue({ data: mockDayPlan }));

    const dayPlan = await aiService.generateDayPlan({
      destination:  'Tokyo',
      tripDates:    '2025-01-01 to 2025-01-07',
      dayNumber:    1,
      preferences:  ['culture'],
      existingPlan: [],
    });

    // Layer 2: Each AI activity persisted as a Firestore destination document
    firestoreHelpers.createDocument
      .mockResolvedValueOnce('dest-ai-001')
      .mockResolvedValueOnce('dest-ai-002');

    const AI_DATE_S = 1_735_689_600; // 2025-01-01
    const savedIds = [];
    for (let i = 0; i < dayPlan.activities.length; i++) {
      const act = dayPlan.activities[i];
      const id = await destService.addDestination('trip-int-005', {
        tripId:         'trip-int-005',
        placeId:        `ai-place-${i}`,
        name:           act.name,
        address:        '',
        lat:            0,
        lng:            0,
        photoReference: null,
        notes:          act.description,
        order:          i,
        date:           { seconds: AI_DATE_S },
      });
      savedIds.push(id);
    }

    // Layer 3: subscribeToDestinations fires with saved data → store updated
    const savedDestinations = dayPlan.activities.map((act, i) => ({
      id:             savedIds[i],
      tripId:         'trip-int-005',
      placeId:        `ai-place-${i}`,
      name:           act.name,
      address:        '',
      lat:            0,
      lng:            0,
      photoReference: null,
      notes:          act.description,
      order:          i,
      date:           { seconds: AI_DATE_S },
      createdAt:      { seconds: AI_DATE_S },
    }));
    useTripStore.getState().setDestinations(savedDestinations);

    // Layer 4: groupDestinationsByDay processes the updated store
    const grouped = groupDestinationsByDay(useTripStore.getState().destinations);

    // Assert Layer 1: Cloud Function routed correctly
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'generateDayPlan');
    expect(dayPlan.activities).toHaveLength(2);

    // Assert Layer 2: Firestore write made for each AI activity
    expect(firestoreHelpers.createDocument).toHaveBeenCalledTimes(2);
    expect(firestoreHelpers.createDocument).toHaveBeenCalledWith(
      'trips/trip-int-005/destinations',
      expect.objectContaining({ name: 'Meiji Shrine', notes: 'Shinto shrine' }),
    );
    expect(firestoreHelpers.createDocument).toHaveBeenCalledWith(
      'trips/trip-int-005/destinations',
      expect.objectContaining({ name: 'Harajuku', notes: 'Fashion district' }),
    );

    // Assert Layer 3: Store contains both AI-generated destinations
    expect(useTripStore.getState().destinations).toHaveLength(2);
    expect(useTripStore.getState().destinations[0].name).toBe('Meiji Shrine');
    expect(useTripStore.getState().destinations[1].name).toBe('Harajuku');

    // Assert Layer 4: Grouped itinerary is correct — both activities in Day 1
    expect(grouped).toHaveLength(1);
    expect(grouped[0].day).toBe(1);
    expect(grouped[0].items).toHaveLength(2);
    expect(grouped[0].items[0].name).toBe('Meiji Shrine');
    expect(grouped[0].items[1].name).toBe('Harajuku');
  });

  // ── IT06 ──────────────────────────────────────────────────────────────────
  test('IT06 — Publish Shared Itinerary → Firestore community shared post write → fetchPublicPosts detects new post', async () => {
    const { useCommunityStore } = require('../src/store/communityStore');
    useCommunityStore.setState({ posts: [] });

    // Layer 1: publishItinerary → createPost → Firestore addDoc
    firestore.addDoc.mockResolvedValue({ id: 'shared-post-int-006' });

    const { postId, shareLink } = await shareService.publishItinerary({
      authorId:         'user-001',
      tripId:           'trip-int-006',
      title:            'Tokyo Highlights',
      destination:      'Tokyo, Japan',
      destinationCount: 5,
      tripDuration:     '7 days',
    });

    // Layer 2: fetchPublicPosts picks up the newly written post from Firestore
    const mockNewPostDoc = {
      id: postId,
      data: () => ({
        authorId:         'user-001',
        title:            'Tokyo Highlights',
        body:             '',
        images:           [],
        destination:      'Tokyo, Japan',
        tags:             [],
        visibility:       'public',
        type:             'shared_itinerary',
        tripId:           'trip-int-006',
        destinationCount: 5,
        likesCount:       0,
        commentsCount:    0,
      }),
    };
    firestore.getDocs.mockResolvedValue({ docs: [mockNewPostDoc] });

    const { posts, lastDoc } = await postService.fetchPublicPosts(null);

    // Layer 3: Community store updated with the fetched posts
    useCommunityStore.getState().setPosts(posts);

    // Assert Layer 1: Firestore addDoc called with shared_itinerary post shape
    expect(firestore.addDoc).toHaveBeenCalledTimes(1);
    expect(firestore.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type:             'shared_itinerary',
        visibility:       'public',
        tripId:           'trip-int-006',
        destinationCount: 5,
        likesCount:       0,
        commentsCount:    0,
      }),
    );
    expect(postId).toBe('shared-post-int-006');
    expect(shareLink).toBe('https://travelmate-2f670.web.app/trip/shared-post-int-006');

    // Assert Layer 2: fetchPublicPosts queries Firestore and returns new post
    expect(firestore.getDocs).toHaveBeenCalledTimes(1);
    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('shared-post-int-006');
    expect(posts[0].type).toBe('shared_itinerary');
    expect(lastDoc).toBe(mockNewPostDoc);

    // Assert Layer 3: Community store holds the new post
    const storePosts = useCommunityStore.getState().posts;
    expect(storePosts).toHaveLength(1);
    expect(storePosts[0].id).toBe('shared-post-int-006');
    expect(storePosts[0].destination).toBe('Tokyo, Japan');
  });

  // ── IT07 ──────────────────────────────────────────────────────────────────
  test("IT07 — Save Community Post → Firestore user savedPostIds updated → profile state reflects saved item", async () => {
    const { useAuthStore } = require('../src/store/authStore');

    // Layer 1: Seed auth store with a user who has no saved posts yet
    const initialProfile = {
      id:          'user-001',
      uid:         'user-001',
      email:       'alice@example.com',
      displayName: 'Alice',
      photoURL:    null,
      bio:         '',
      isAdmin:     false,
      createdAt:   { seconds: BASE_S },
      savedPostIds: [],
    };
    useAuthStore.setState({ profile: initialProfile });

    // Layer 2: toggleSaved(save=false) → Firestore updateDoc with arrayUnion
    firestore.updateDoc.mockResolvedValue(undefined);
    await postService.toggleSaved('post-save-int-007', 'user-001', false);

    // Layer 3: Simulate the app updating the profile in the store after the save
    const current = useAuthStore.getState().profile;
    useAuthStore.getState().setProfile({
      ...current,
      savedPostIds: [...(current.savedPostIds ?? []), 'post-save-int-007'],
    });

    // Assert Layer 2: Firestore updateDoc called with arrayUnion on the users doc
    expect(firestore.updateDoc).toHaveBeenCalledTimes(1);
    expect(firestore.arrayUnion).toHaveBeenCalledWith('post-save-int-007');

    // Assert Layer 3: Auth store profile now contains the saved post ID
    const { profile } = useAuthStore.getState();
    expect(profile.savedPostIds).toContain('post-save-int-007');
    expect(profile.savedPostIds).toHaveLength(1);

    // Bonus: unsave the same post and verify removal
    firestore.updateDoc.mockResolvedValue(undefined);
    await postService.toggleSaved('post-save-int-007', 'user-001', true);

    const current2 = useAuthStore.getState().profile;
    useAuthStore.getState().setProfile({
      ...current2,
      savedPostIds: (current2.savedPostIds ?? []).filter((id) => id !== 'post-save-int-007'),
    });

    expect(firestore.arrayRemove).toHaveBeenCalledWith('post-save-int-007');
    expect(useAuthStore.getState().profile.savedPostIds).not.toContain('post-save-int-007');
  });

  // ── IT08 ──────────────────────────────────────────────────────────────────
  test("IT08 — Edit Profile → Firestore profile update → new author info used in created community post", async () => {
    const { useAuthStore } = require('../src/store/authStore');

    // Layer 1: Seed store with original profile
    const originalProfile = {
      id:          'user-001',
      uid:         'user-001',
      email:       'alice@example.com',
      displayName: 'Alice',
      photoURL:    null,
      bio:         'Old bio',
      isAdmin:     false,
      createdAt:   { seconds: BASE_S },
      savedPostIds: [],
    };
    useAuthStore.setState({ profile: originalProfile });

    // Layer 2: updateProfile → Firestore updateDocument write
    firestoreHelpers.updateDocument.mockResolvedValue(undefined);
    const updatedProfile = await profileService.updateProfile(
      originalProfile,
      'Alice Wanderer',
      'Travel is life',
    );

    // Layer 3: Auth store receives the updated profile snapshot
    useAuthStore.getState().setProfile({ ...updatedProfile, savedPostIds: [] });

    // Layer 4: Create a community post using the fresh author info from store
    firestore.addDoc.mockResolvedValue({ id: 'post-int-008' });
    const authorInStore = useAuthStore.getState().profile;
    const postId = await postService.createPost({
      authorId:    authorInStore.uid,
      title:       `${authorInStore.displayName}'s Trip to Bali`,
      body:        'Just returned from an amazing journey.',
      images:      [],
      destination: 'Bali, Indonesia',
      tags:        ['travel', 'asia'],
      visibility:  'public',
    });

    // Assert Layer 2: Firestore updateDocument called with trimmed new display name + bio
    expect(firestoreHelpers.updateDocument).toHaveBeenCalledWith(
      'users',
      'user-001',
      expect.objectContaining({ displayName: 'Alice Wanderer', bio: 'Travel is life' }),
    );

    // Assert Layer 3: Store profile reflects the updated values
    const storeProfile = useAuthStore.getState().profile;
    expect(storeProfile.displayName).toBe('Alice Wanderer');
    expect(storeProfile.bio).toBe('Travel is life');

    // Assert Layer 4: Post written to Firestore carries the updated author name
    expect(firestore.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        authorId: 'user-001',
        title:    "Alice Wanderer's Trip to Bali",
      }),
    );
    expect(postId).toBe('post-int-008');
  });

  // ── IT09 ──────────────────────────────────────────────────────────────────
  test("IT09 — Delete Trip → Firestore delete invoked → trip store cleared → itinerary subscription empty", async () => {
    const { useTripStore } = require('../src/store/tripStore');

    // Layer 1: Seed store with two trips and a destination belonging to the one to be deleted
    const tripToDelete = makeTrip({ id: 'trip-del-int-009', title: 'Deleted Trip' });
    const tripToKeep   = makeTrip({ id: 'trip-keep-int-009', title: 'Keeper Trip' });
    const orphanDest   = makeDestination({ id: 'dest-del-1', tripId: 'trip-del-int-009' });

    useTripStore.setState({
      trips:        [tripToDelete, tripToKeep],
      destinations: [orphanDest],
    });

    // Layer 2: deleteTrip → Firestore deleteDocument
    firestoreHelpers.deleteDocument.mockResolvedValue(undefined);
    await tripService.deleteTrip('trip-del-int-009');

    // Layer 3: Store synchronised — trip removed, destinations cleared
    useTripStore.getState().removeTrip('trip-del-int-009');
    useTripStore.getState().setDestinations([]);

    // Layer 4: subscribeToDestinations for the deleted trip now yields nothing
    firestoreHelpers.subscribeToCollection.mockImplementation((_path, _constraints, callback) => {
      callback([]);
      return jest.fn();
    });
    const receivedDests = [];
    const unsubscribe = destService.subscribeToDestinations('trip-del-int-009', (dests) => {
      receivedDests.push(...dests);
    });

    // Assert Layer 2: Firestore deleteDocument called with correct args
    expect(firestoreHelpers.deleteDocument).toHaveBeenCalledTimes(1);
    expect(firestoreHelpers.deleteDocument).toHaveBeenCalledWith('trips', 'trip-del-int-009');

    // Assert Layer 3: Trip removed from store; surviving trip still present; destinations cleared
    const { trips, destinations } = useTripStore.getState();
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe('trip-keep-int-009');
    expect(destinations).toHaveLength(0);

    // Assert Layer 4: Subscription for the deleted trip path returns an empty set
    expect(firestoreHelpers.subscribeToCollection).toHaveBeenCalledWith(
      'trips/trip-del-int-009/destinations',
      expect.anything(),
      expect.any(Function),
    );
    expect(receivedDests).toHaveLength(0);
    expect(typeof unsubscribe).toBe('function');
  });

  // ── IT10 ──────────────────────────────────────────────────────────────────
  test("IT10 — AI Chat Request → Firebase callable invoked with existing trip/dayplan context", async () => {
    const { useTripStore } = require('../src/store/tripStore');

    // Layer 1: Store holds active trip + existing day-plan destinations
    const activeTrip = makeTrip({
      id:        'trip-int-010',
      title:     'Paris Escape',
      startDate: { seconds: 1_740_000_000 },
      endDate:   { seconds: 1_740_518_400 },
    });
    useTripStore.setState({
      activeTrip,
      destinations: [
        makeDestination({ id: 'd1', tripId: 'trip-int-010', name: 'Eiffel Tower',  order: 0, date: { seconds: 1_740_000_000 }, createdAt: { seconds: 1_740_000_000 } }),
        makeDestination({ id: 'd2', tripId: 'trip-int-010', name: 'Louvre Museum', order: 1, date: { seconds: 1_740_000_000 }, createdAt: { seconds: 1_740_000_000 } }),
      ],
    });

    // Layer 2: chatAssistant → Firebase Cloud Function callable
    const expectedReply = 'For Day 2 in Paris, I recommend visiting Montmartre and Sacré-Cœur...';
    const mockCallableFn = jest.fn().mockResolvedValue({ data: { reply: expectedReply } });
    httpsCallable.mockReturnValue(mockCallableFn);

    // Build request from store context — as the app hook would
    const existingPlan = useTripStore.getState().destinations.map((d) => d.name);
    const tripContext  = useTripStore.getState().activeTrip;

    const reply = await aiService.chatAssistant({
      userMessage: 'What should I do on Day 2 in Paris?',
      destination: tripContext.title,
      tripDates:   `${tripContext.startDate.seconds} to ${tripContext.endDate.seconds}`,
      preferences: ['art', 'food'],
      existingPlan,
    });

    // Assert Layer 1: Context correctly read from store before the call
    expect(existingPlan).toEqual(['Eiffel Tower', 'Louvre Museum']);
    expect(tripContext.title).toBe('Paris Escape');

    // Assert Layer 2a: httpsCallable routed to the correct Cloud Function
    expect(httpsCallable).toHaveBeenCalledWith(expect.anything(), 'chatAssistant');

    // Assert Layer 2b: Callable invoked with the full trip-context payload
    expect(mockCallableFn).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage:  'What should I do on Day 2 in Paris?',
        destination:  'Paris Escape',
        existingPlan: ['Eiffel Tower', 'Louvre Museum'],
        preferences:  ['art', 'food'],
      }),
    );

    // Assert result: string reply returned from the Cloud Function
    expect(typeof reply).toBe('string');
    expect(reply.length).toBeGreaterThan(0);
    expect(reply).toBe(expectedReply);
  });
});
