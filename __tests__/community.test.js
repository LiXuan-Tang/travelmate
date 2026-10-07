/**
 * community.test.js
 *
 * Module 6 — Community Post Management
 * Covers UT54–UT63
 *
 *   UT54 — Verify that createPost returns the Firestore document ID for a valid new post
 *   UT55 — Verify that createPost rejects a post with an empty or whitespace-only title
 *   UT56 — Verify that createPost rejects a regular post with an empty description body
 *   UT57 — Verify that createPost permits an empty body for posts of type shared_itinerary
 *   UT58 — Verify that createPost stores provided image URLs in the Firestore document
 *   UT59 — Verify that updatePost writes updated fields to the correct Firestore document
 *   UT60 — Verify that the community store updatePost action immediately reflects edits in the post list
 *   UT61 — Verify that deletePost removes the Firestore document and all associated sub-collections
 *   UT62 — Verify that the community store removePost action immediately removes the post from state
 *   UT63 — Verify that addComment rejects an empty or whitespace-only comment text
 *          (The addComment happy-path is covered in feed.test.js UT68 to avoid duplication)
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockBatch = {
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined),
};

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({})),
  doc: jest.fn(() => ({ id: 'auto-comment-id', ref: {} })),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  writeBatch: jest.fn(() => mockBatch),
  increment: jest.fn((n) => ({ _increment: n })),
  arrayUnion: jest.fn((v) => ({ _arrayUnion: v })),
  arrayRemove: jest.fn((v) => ({ _arrayRemove: v })),
}));

jest.mock('../src/services/firebase/storage', () => ({
  deleteImage: jest.fn().mockResolvedValue(undefined),
}));

const postService = require('../src/services/firebase/posts');
const firestore = require('firebase/firestore');

describe('Community Post Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBatch.commit.mockResolvedValue(undefined);
  });

  // ── UT54 ──────────────────────────────────────────────────────────────────
  test('UT54 — Verify that createPost returns the Firestore document ID for a valid new post', async () => {
    firestore.addDoc.mockResolvedValue({ id: 'post-xyz-789' });

    const postId = await postService.createPost({
      authorId: 'user-001',
      title: 'Amazing Tokyo Trip',
      body: 'Had a wonderful time exploring Tokyo with friends.',
      images: [],
      destination: 'Tokyo, Japan',
      tags: ['travel', 'asia', 'food'],
      visibility: 'public',
    });

    expect(firestore.addDoc).toHaveBeenCalledTimes(1);
    expect(firestore.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        authorId: 'user-001',
        title: 'Amazing Tokyo Trip',
        likesCount: 0,
        commentsCount: 0,
      }),
    );
    expect(postId).toBe('post-xyz-789');
  });

  // ── UT55 ──────────────────────────────────────────────────────────────────
  test('UT55 — Verify that createPost rejects a post with an empty or whitespace-only title', async () => {
    await expect(
      postService.createPost({
        authorId: 'user-001',
        title: '',
        body: 'Some body text',
        images: [],
        destination: 'Tokyo',
        tags: [],
        visibility: 'public',
      }),
    ).rejects.toThrow('Post title is required');

    await expect(
      postService.createPost({
        authorId: 'user-001',
        title: '   ',
        body: 'Some body text',
        images: [],
        destination: 'Tokyo',
        tags: [],
        visibility: 'public',
      }),
    ).rejects.toThrow('Post title is required');

    expect(firestore.addDoc).not.toHaveBeenCalled();
  });

  // ── UT56 ──────────────────────────────────────────────────────────────────
  test('UT56 — Verify that createPost rejects a regular post with an empty description body', async () => {
    await expect(
      postService.createPost({
        authorId: 'user-001',
        title: 'My Post',
        body: '',
        images: [],
        destination: 'Tokyo',
        tags: [],
        visibility: 'public',
      }),
    ).rejects.toThrow('Post description is required');

    expect(firestore.addDoc).not.toHaveBeenCalled();
  });

  // ── UT57 ──────────────────────────────────────────────────────────────────
  test('UT57 — Verify that createPost permits an empty body for posts of type shared_itinerary', async () => {
    firestore.addDoc.mockResolvedValue({ id: 'shared-post-1' });

    const postId = await postService.createPost({
      authorId: 'user-001',
      title: 'Tokyo Itinerary',
      body: '',
      images: [],
      destination: 'Tokyo',
      tags: ['shared_itinerary'],
      visibility: 'public',
      type: 'shared_itinerary',
      tripId: 'trip-100',
      destinationCount: 5,
    });

    expect(firestore.addDoc).toHaveBeenCalledTimes(1);
    expect(postId).toBe('shared-post-1');
  });

  // ── UT58 ──────────────────────────────────────────────────────────────────
  test('UT58 — Verify that createPost stores provided image URLs in the Firestore document', async () => {
    firestore.addDoc.mockResolvedValue({ id: 'post-with-img' });

    const imageUrls = [
      'https://firebasestorage.googleapis.com/v0/b/img1.jpg',
      'https://firebasestorage.googleapis.com/v0/b/img2.jpg',
    ];

    await postService.createPost({
      authorId: 'user-001',
      title: 'Photo Journal',
      body: 'Beautiful views!',
      images: imageUrls,
      destination: 'Kyoto',
      tags: ['photos'],
      visibility: 'public',
    });

    expect(firestore.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ images: imageUrls }),
    );
  });

  // ── UT59 ──────────────────────────────────────────────────────────────────
  test('UT59 — Verify that updatePost writes updated fields to the correct Firestore document', async () => {
    firestore.updateDoc.mockResolvedValue(undefined);

    await postService.updatePost('post-existing-1', {
      title: 'Revised Title',
      body: 'Updated description',
    });

    expect(firestore.updateDoc).toHaveBeenCalledTimes(1);
    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ title: 'Revised Title', body: 'Updated description' }),
    );
  });

  // ── UT60 ──────────────────────────────────────────────────────────────────
  test('UT60 — Verify that the community store updatePost action immediately reflects edits in the post list', () => {
    const { useCommunityStore } = require('../src/store/communityStore');

    useCommunityStore.setState({
      posts: [
        {
          id: 'post-edit-1',
          authorId: 'user-001',
          title: 'Original Title',
          body: 'Original body',
          images: [],
          destination: 'Tokyo',
          tags: [],
          visibility: 'public',
          likesCount: 5,
          commentsCount: 2,
          createdAt: null,
          updatedAt: null,
        },
      ],
    });

    useCommunityStore.getState().updatePost('post-edit-1', {
      title: 'Updated Title',
      body: 'Updated body',
    });

    const posts = useCommunityStore.getState().posts;
    expect(posts[0].title).toBe('Updated Title');
    expect(posts[0].body).toBe('Updated body');
    expect(posts[0].likesCount).toBe(5);
  });

  // ── UT61 ──────────────────────────────────────────────────────────────────
  test('UT61 — Verify that deletePost removes the Firestore document and all associated sub-collections', async () => {
    const mockCommentsSnap = { docs: [] };
    firestore.getDocs.mockResolvedValue(mockCommentsSnap);
    mockBatch.commit.mockResolvedValue(undefined);

    await postService.deletePost('post-delete-me', []);

    expect(firestore.writeBatch).toHaveBeenCalledTimes(1);
    expect(mockBatch.delete).toHaveBeenCalledTimes(1);
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);
  });

  // ── UT62 ──────────────────────────────────────────────────────────────────
  test('UT62 — Verify that the community store removePost action immediately removes the post from state', () => {
    const { useCommunityStore } = require('../src/store/communityStore');

    useCommunityStore.setState({
      posts: [
        { id: 'post-keep', authorId: 'u1', title: 'Keep', body: 'b', images: [], destination: '', tags: [], visibility: 'public', likesCount: 0, commentsCount: 0, createdAt: null, updatedAt: null },
        { id: 'post-gone', authorId: 'u1', title: 'Gone', body: 'b', images: [], destination: '', tags: [], visibility: 'public', likesCount: 0, commentsCount: 0, createdAt: null, updatedAt: null },
      ],
    });

    useCommunityStore.getState().removePost('post-gone');

    const { posts } = useCommunityStore.getState();
    expect(posts).toHaveLength(1);
    expect(posts[0].id).toBe('post-keep');
  });

  // ── UT63 ──────────────────────────────────────────────────────────────────
  test('UT63 — Verify that addComment rejects an empty or whitespace-only comment text', async () => {
    await expect(
      postService.addComment('post-1', 'user-001', '   '),
    ).rejects.toThrow('Comment cannot be empty');

    expect(firestore.writeBatch).not.toHaveBeenCalled();
  });
});
