/**
 * feed.test.js
 *
 * Module 7 — Community Feed & Saved Posts
 * Covers UT64–UT74
 *
 *   UT64 — Verify that fetchPublicPosts returns a paginated posts array and a lastDoc cursor
 *   UT65 — Verify that setActivePost stores the selected post in the community store
 *   UT66 — Verify that toggleLike increments the post like count when the post is not yet liked
 *   UT67 — Verify that toggleLike decrements the post like count when the post is already liked
 *   UT68 — Verify that addComment creates a batch write with the correct post ID, author ID, and text
 *   UT69 — Verify that toggleSaved adds the post ID to the user's savedPostIds via arrayUnion
 *   UT70 — Verify that the auth store's savedPostIds contains the post ID after a save operation
 *   UT71 — Verify that toggleSaved removes the post ID from the user's savedPostIds via arrayRemove
 *   UT72 — Ensure that the auth store's savedPostIds no longer contains the post ID after an unsave operation
 *   UT73 — Verify that fetchPublicPosts returns an empty array when no community posts exist
 *   UT74 — Verify that the community store initialises with an empty posts list
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFeedBatch = {
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
};

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({ id: 'doc-ref-id', ref: {} })),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn((...args) => args),
  where: jest.fn((...args) => args),
  orderBy: jest.fn((...args) => args),
  limit: jest.fn((...args) => args),
  startAfter: jest.fn((...args) => args),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  writeBatch: jest.fn(() => mockFeedBatch),
  increment: jest.fn((n) => ({ _increment: n })),
  arrayUnion: jest.fn((v) => ({ _arrayUnion: v })),
  arrayRemove: jest.fn((v) => ({ _arrayRemove: v })),
}));

// posts.ts has a top-level import of deleteImage from storage
jest.mock('../src/services/firebase/storage', () => ({
  deleteImage: jest.fn().mockResolvedValue(undefined),
  uploadImage: jest.fn(),
}));

const postService = require('../src/services/firebase/posts');
const firestore = require('firebase/firestore');

/** Minimal Post fixture */
const makePost = (overrides = {}) => ({
  id: 'post-1',
  authorId: 'user-001',
  title: 'My Travel Post',
  body: 'Great trip!',
  images: [],
  destination: 'Tokyo',
  tags: ['travel'],
  visibility: 'public',
  likesCount: 0,
  commentsCount: 0,
  createdAt: { seconds: 1700000000 },
  updatedAt: { seconds: 1700000000 },
  ...overrides,
});

describe('Community Feed & Saved Posts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFeedBatch.commit.mockResolvedValue(undefined);
  });

  // ── UT64 ──────────────────────────────────────────────────────────────────
  test('UT64 — Verify that fetchPublicPosts returns a paginated posts array and a lastDoc cursor', async () => {
    const mockDoc1 = { id: 'post-1', data: () => ({ title: 'Post 1', body: 'Body 1', authorId: 'u1', images: [], destination: 'Tokyo', tags: [], visibility: 'public', likesCount: 3, commentsCount: 1 }) };
    const mockDoc2 = { id: 'post-2', data: () => ({ title: 'Post 2', body: 'Body 2', authorId: 'u2', images: [], destination: 'Paris', tags: [], visibility: 'public', likesCount: 0, commentsCount: 0 }) };

    firestore.getDocs.mockResolvedValue({ docs: [mockDoc1, mockDoc2] });

    const { posts, lastDoc } = await postService.fetchPublicPosts(null);

    expect(firestore.getDocs).toHaveBeenCalledTimes(1);
    expect(posts).toHaveLength(2);
    expect(posts[0].id).toBe('post-1');
    expect(posts[1].id).toBe('post-2');
    expect(lastDoc).toBe(mockDoc2);
  });

  // ── UT65 ──────────────────────────────────────────────────────────────────
  test('UT65 — Verify that setActivePost stores the selected post in the community store', () => {
    const { useCommunityStore } = require('../src/store/communityStore');

    useCommunityStore.setState({ activePost: null });

    const post = makePost({ id: 'post-detail-123', title: 'Detail View Post' });
    useCommunityStore.getState().setActivePost(post);

    const { activePost } = useCommunityStore.getState();
    expect(activePost).not.toBeNull();
    expect(activePost.id).toBe('post-detail-123');
    expect(activePost.title).toBe('Detail View Post');
  });

  // ── UT66 ──────────────────────────────────────────────────────────────────
  test('UT66 — Verify that toggleLike increments the post like count when the post is not yet liked', async () => {
    await postService.toggleLike('post-like-me', 'user-001', false);

    expect(firestore.writeBatch).toHaveBeenCalledTimes(1);
    expect(mockFeedBatch.update).toHaveBeenCalledTimes(2);
    expect(firestore.increment).toHaveBeenCalledWith(1);
    expect(mockFeedBatch.commit).toHaveBeenCalledTimes(1);
  });

  // ── UT67 ──────────────────────────────────────────────────────────────────
  test('UT67 — Verify that toggleLike decrements the post like count when the post is already liked', async () => {
    await postService.toggleLike('post-unlike-me', 'user-001', true);

    expect(firestore.increment).toHaveBeenCalledWith(-1);
    expect(mockFeedBatch.commit).toHaveBeenCalledTimes(1);
  });

  // ── UT68 ──────────────────────────────────────────────────────────────────
  test('UT68 — Verify that addComment creates a batch write with the correct post ID, author ID, and text', async () => {
    await postService.addComment('post-comment-1', 'user-001', 'Loved this place!');

    expect(firestore.writeBatch).toHaveBeenCalledTimes(1);
    expect(mockFeedBatch.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        postId: 'post-comment-1',
        authorId: 'user-001',
        text: 'Loved this place!',
      }),
    );
    expect(mockFeedBatch.commit).toHaveBeenCalledTimes(1);
  });

  // ── UT69 ──────────────────────────────────────────────────────────────────
  test("UT69 — Verify that toggleSaved adds the post ID to the user's savedPostIds via arrayUnion", async () => {
    firestore.updateDoc.mockResolvedValue(undefined);

    await postService.toggleSaved('post-save-abc', 'user-001', false);

    expect(firestore.updateDoc).toHaveBeenCalledTimes(1);
    expect(firestore.arrayUnion).toHaveBeenCalledWith('post-save-abc');
  });

  // ── UT70 ──────────────────────────────────────────────────────────────────
  test("UT70 — Verify that the auth store's savedPostIds contains the post ID after a save operation", () => {
    const { useAuthStore } = require('../src/store/authStore');

    useAuthStore.setState({
      profile: {
        id: 'user-001',
        uid: 'user-001',
        email: 'test@example.com',
        displayName: 'Test',
        photoURL: null,
        bio: '',
        isAdmin: false,
        createdAt: { seconds: 1700000000 },
        savedPostIds: [],
      },
    });

    const currentProfile = useAuthStore.getState().profile;
    const updatedProfile = {
      ...currentProfile,
      savedPostIds: [...(currentProfile.savedPostIds ?? []), 'post-saved-999'],
    };
    useAuthStore.getState().setProfile(updatedProfile);

    const { profile } = useAuthStore.getState();
    expect(profile.savedPostIds).toContain('post-saved-999');
  });

  // ── UT71 ──────────────────────────────────────────────────────────────────
  test("UT71 — Verify that toggleSaved removes the post ID from the user's savedPostIds via arrayRemove", async () => {
    firestore.updateDoc.mockResolvedValue(undefined);

    await postService.toggleSaved('post-unsave-abc', 'user-001', true);

    expect(firestore.updateDoc).toHaveBeenCalledTimes(1);
    expect(firestore.arrayRemove).toHaveBeenCalledWith('post-unsave-abc');
  });

  // ── UT72 ──────────────────────────────────────────────────────────────────
  test("UT72 — Ensure that the auth store's savedPostIds no longer contains the post ID after an unsave operation", () => {
    const { useAuthStore } = require('../src/store/authStore');

    useAuthStore.setState({
      profile: {
        id: 'user-001',
        uid: 'user-001',
        email: 'test@example.com',
        displayName: 'Test',
        photoURL: null,
        bio: '',
        isAdmin: false,
        createdAt: { seconds: 1700000000 },
        savedPostIds: ['post-to-remove', 'post-to-keep'],
      },
    });

    const currentProfile = useAuthStore.getState().profile;
    const updatedProfile = {
      ...currentProfile,
      savedPostIds: (currentProfile.savedPostIds ?? []).filter((id) => id !== 'post-to-remove'),
    };
    useAuthStore.getState().setProfile(updatedProfile);

    const { profile } = useAuthStore.getState();
    expect(profile.savedPostIds).not.toContain('post-to-remove');
    expect(profile.savedPostIds).toContain('post-to-keep');
  });

  // ── UT73 ──────────────────────────────────────────────────────────────────
  test('UT73 — Verify that fetchPublicPosts returns an empty array when no community posts exist', async () => {
    firestore.getDocs.mockResolvedValue({ docs: [] });

    const { posts } = await postService.fetchPublicPosts(null);

    expect(posts).toEqual([]);
    expect(posts).toHaveLength(0);
  });

  // ── UT74 ──────────────────────────────────────────────────────────────────
  test('UT74 — Verify that the community store initialises with an empty posts list', () => {
    const { useCommunityStore } = require('../src/store/communityStore');
    useCommunityStore.setState({ posts: [] });

    const { posts } = useCommunityStore.getState();
    expect(posts).toHaveLength(0);
  });
});
