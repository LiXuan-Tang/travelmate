/**
 * share.test.js
 *
 * Module 8 — Share Itinerary
 * Covers UT75–UT83
 *
 *   UT75 — Verify that generateShareLink and publishItinerary are exported as callable functions
 *   UT76 — Verify that publishItinerary creates a public shared_itinerary post and returns a postId and shareLink
 *   UT77 — Verify that generateShareLink returns the correct Firebase Hosting URL and is parseable as a URL
 *   UT78 — Verify that generateAppSchemeLink returns the correct custom-scheme deep link
 *   UT79 — Verify that two distinct post IDs produce two distinct share links
 *   UT80 — Verify that publishItinerary rejects an itinerary with zero destinations
 *   UT81 — Verify that publishItinerary rejects an itinerary with a missing trip ID
 *   UT82 — Verify that publishItinerary rejects an itinerary with a missing destination name
 *   UT83 — Verify that a Firestore error during publishItinerary is propagated to the caller
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../src/services/firebase/posts', () => ({
  createPost: jest.fn(),
}));

const { generateShareLink, generateAppSchemeLink } = require('../src/services/firebase/dynamicLinks');
const shareService = require('../src/services/share');
const postService = require('../src/services/firebase/posts');

const BASE_PARAMS = {
  authorId: 'user-001',
  tripId: 'trip-100',
  title: 'Tokyo Highlights',
  destination: 'Tokyo, Japan',
  destinationCount: 5,
  tripDuration: '7 days',
};

describe('Share Itinerary Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── UT75 ──────────────────────────────────────────────────────────────────
  test('UT75 — Verify that generateShareLink and publishItinerary are exported as callable functions', () => {
    expect(typeof generateShareLink).toBe('function');
    expect(typeof shareService.publishItinerary).toBe('function');

    const link = generateShareLink('any-post-id');
    expect(typeof link).toBe('string');
    expect(link.length).toBeGreaterThan(0);
  });

  // ── UT76 ──────────────────────────────────────────────────────────────────
  test('UT76 — Verify that publishItinerary creates a public shared_itinerary post and returns a postId and shareLink', async () => {
    postService.createPost.mockResolvedValue('new-post-999');

    const result = await shareService.publishItinerary(BASE_PARAMS);

    expect(postService.createPost).toHaveBeenCalledTimes(1);
    expect(postService.createPost).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 'user-001',
        tripId: 'trip-100',
        type: 'shared_itinerary',
        destinationCount: 5,
        visibility: 'public',
      }),
    );
    expect(result.postId).toBe('new-post-999');
    expect(result.shareLink).toBe('https://travelmate-2f670.web.app/trip/new-post-999');
  });

  // ── UT77 ──────────────────────────────────────────────────────────────────
  test('UT77 — Verify that generateShareLink returns the correct Firebase Hosting URL and is parseable as a URL', () => {
    const link = generateShareLink('post-abc-123');

    expect(link).toBe('https://travelmate-2f670.web.app/trip/post-abc-123');
    expect(() => new URL(link)).not.toThrow();
  });

  // ── UT78 ──────────────────────────────────────────────────────────────────
  test('UT78 — Verify that generateAppSchemeLink returns the correct custom-scheme deep link', () => {
    const link = generateAppSchemeLink('post-abc-123');
    expect(link).toBe('travelmate://shared-trip/post-abc-123');
  });

  // ── UT79 ──────────────────────────────────────────────────────────────────
  test('UT79 — Verify that two distinct post IDs produce two distinct share links', () => {
    const link1 = generateShareLink('post-aaa');
    const link2 = generateShareLink('post-bbb');
    expect(link1).not.toBe(link2);
    expect(link1).toContain('post-aaa');
    expect(link2).toContain('post-bbb');
  });

  // ── UT80 ──────────────────────────────────────────────────────────────────
  test('UT80 — Verify that publishItinerary rejects an itinerary with zero destinations', async () => {
    await expect(
      shareService.publishItinerary({ ...BASE_PARAMS, destinationCount: 0 }),
    ).rejects.toThrow('Itinerary must have at least one destination to share');

    expect(postService.createPost).not.toHaveBeenCalled();
  });

  // ── UT81 ──────────────────────────────────────────────────────────────────
  test('UT81 — Verify that publishItinerary rejects an itinerary with a missing trip ID', async () => {
    await expect(
      shareService.publishItinerary({ ...BASE_PARAMS, tripId: '' }),
    ).rejects.toThrow('Trip ID is required to share itinerary');

    expect(postService.createPost).not.toHaveBeenCalled();
  });

  // ── UT82 ──────────────────────────────────────────────────────────────────
  test('UT82 — Verify that publishItinerary rejects an itinerary with a missing destination name', async () => {
    await expect(
      shareService.publishItinerary({ ...BASE_PARAMS, destination: '   ' }),
    ).rejects.toThrow('Destination is required to share itinerary');

    expect(postService.createPost).not.toHaveBeenCalled();
  });

  // ── UT83 ──────────────────────────────────────────────────────────────────
  test('UT83 — Verify that a Firestore error during publishItinerary is propagated to the caller', async () => {
    postService.createPost.mockRejectedValue(new Error('permission-denied'));

    await expect(
      shareService.publishItinerary(BASE_PARAMS),
    ).rejects.toThrow('permission-denied');
  });
});
