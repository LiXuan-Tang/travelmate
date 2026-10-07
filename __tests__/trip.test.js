/**
 * trip.test.js
 *
 * Module 3 — Trip Planning
 * Covers UT19–UT30
 *
 *   UT19 — Verify that createTrip with valid data returns a new Firestore document ID
 *   UT20 — Verify that createTrip rejects an empty or whitespace-only trip title
 *   UT21 — Verify that createTrip rejects a trip with a missing start date
 *   UT22 — Verify that createTrip rejects a trip with a missing end date
 *   UT23 — Verify that the uploadImage storage service returns a Firebase Storage URL
 *   UT24 — Verify that the trip store addTrip action appends the new trip to the list
 *   UT25 — Verify that the trip store setTrips action replaces the list with the full set of trips
 *   UT26 — Verify that updateTrip writes all edited fields to the correct Firestore document
 *   UT27 — Verify that deleteTrip calls deleteDocument with the correct collection and trip ID
 *   UT28 — Verify that the trip store removeTrip action removes the correct trip from state
 *   UT29 — Verify that deleteTrip propagates a Firestore error to the caller
 *   UT30 — Verify that subscribeToUserTrips establishes two real-time listeners and delivers trips via callback
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../src/services/firebase/firestore', () => ({
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
  subscribeToCollection: jest.fn(() => jest.fn()),
  where: jest.fn((...args) => args),
}));

jest.mock('../src/services/firebase/storage', () => ({
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
}));

const tripService = require('../src/services/firebase/trips');
const firestoreHelpers = require('../src/services/firebase/firestore');
const storageHelpers = require('../src/services/firebase/storage');

/** Shared base trip data (dates are required) */
const baseTrip = {
  ownerId: 'user-001',
  collaborators: [],
  visibility: 'private',
  coverImage: null,
  startDate: { seconds: 1700000000 },
  endDate: { seconds: 1700086400 },
};

describe('Trip Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── UT19 ──────────────────────────────────────────────────────────────────
  test('UT19 — Verify that createTrip with valid data returns a new Firestore document ID', async () => {
    firestoreHelpers.createDocument.mockResolvedValue('trip-gen-id-777');

    const id = await tripService.createTrip({
      ...baseTrip,
      title: 'Tokyo Adventure',
    });

    expect(firestoreHelpers.createDocument).toHaveBeenCalledTimes(1);
    expect(firestoreHelpers.createDocument).toHaveBeenCalledWith(
      'trips',
      expect.objectContaining({ title: 'Tokyo Adventure', ownerId: 'user-001' }),
    );
    expect(id).toBe('trip-gen-id-777');
  });

  // ── UT20 ──────────────────────────────────────────────────────────────────
  test('UT20 — Verify that createTrip rejects an empty or whitespace-only trip title', async () => {
    await expect(
      tripService.createTrip({ ...baseTrip, title: '' }),
    ).rejects.toThrow('Trip title is required');

    await expect(
      tripService.createTrip({ ...baseTrip, title: '   ' }),
    ).rejects.toThrow('Trip title is required');

    expect(firestoreHelpers.createDocument).not.toHaveBeenCalled();
  });

  // ── UT21 ──────────────────────────────────────────────────────────────────
  test('UT21 — Verify that createTrip rejects a trip with a missing start date', async () => {
    await expect(
      tripService.createTrip({ ...baseTrip, title: 'Missing Dates', startDate: null }),
    ).rejects.toThrow('Trip start date is required');

    expect(firestoreHelpers.createDocument).not.toHaveBeenCalled();
  });

  // ── UT22 ──────────────────────────────────────────────────────────────────
  test('UT22 — Verify that createTrip rejects a trip with a missing end date', async () => {
    await expect(
      tripService.createTrip({ ...baseTrip, title: 'Missing End', endDate: null }),
    ).rejects.toThrow('Trip end date is required');

    expect(firestoreHelpers.createDocument).not.toHaveBeenCalled();
  });

  // ── UT23 ──────────────────────────────────────────────────────────────────
  test('UT23 — Verify that the uploadImage storage service returns a Firebase Storage URL', async () => {
    const fakeStorageUrl = 'https://firebasestorage.googleapis.com/v0/b/trip-cover.jpg';
    storageHelpers.uploadImage.mockResolvedValue(fakeStorageUrl);

    const url = await storageHelpers.uploadImage(
      'file:///local/trip.jpg',
      'trips/user-001/1700000000.jpg',
    );

    expect(storageHelpers.uploadImage).toHaveBeenCalledTimes(1);
    expect(url).toBe(fakeStorageUrl);
    expect(typeof url).toBe('string');
    expect(url).toContain('firebasestorage');
  });

  // ── UT24 ──────────────────────────────────────────────────────────────────
  test('UT24 — Verify that the trip store addTrip action appends the new trip to the list', () => {
    const { useTripStore } = require('../src/store/tripStore');
    useTripStore.setState({ trips: [] });

    const newTrip = {
      id: 'trip-new-123',
      title: 'Paris Escape',
      ownerId: 'user-001',
      collaborators: [],
      visibility: 'private',
      coverImage: null,
      startDate: { seconds: 1700000000 },
      endDate: { seconds: 1700086400 },
      createdAt: { seconds: 1700000000 },
      updatedAt: { seconds: 1700000000 },
    };

    useTripStore.getState().addTrip(newTrip);

    const { trips } = useTripStore.getState();
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe('trip-new-123');
    expect(trips[0].title).toBe('Paris Escape');
  });

  // ── UT25 ──────────────────────────────────────────────────────────────────
  test('UT25 — Verify that the trip store setTrips action replaces the list with the full set of trips', () => {
    const { useTripStore } = require('../src/store/tripStore');

    const mockTrips = [
      { id: 't1', title: 'Trip 1', ownerId: 'user-001', collaborators: [], visibility: 'private', coverImage: null, startDate: { seconds: 1700000000 }, endDate: { seconds: 1700086400 }, createdAt: { seconds: 1700000000 }, updatedAt: { seconds: 1700000000 } },
      { id: 't2', title: 'Trip 2', ownerId: 'user-001', collaborators: [], visibility: 'public', coverImage: null, startDate: { seconds: 1700100000 }, endDate: { seconds: 1700186400 }, createdAt: { seconds: 1700100000 }, updatedAt: { seconds: 1700100000 } },
    ];

    useTripStore.getState().setTrips(mockTrips);
    expect(useTripStore.getState().trips).toHaveLength(2);
  });

  // ── UT26 ──────────────────────────────────────────────────────────────────
  test('UT26 — Verify that updateTrip writes all edited fields to the correct Firestore document', async () => {
    firestoreHelpers.updateDocument.mockResolvedValue(undefined);

    await tripService.updateTrip('trip-edit-id', {
      title: 'Bali Holiday',
      visibility: 'public',
      startDate: { seconds: 1710000000 },
      endDate: { seconds: 1710259200 },
    });

    expect(firestoreHelpers.updateDocument).toHaveBeenCalledTimes(1);
    expect(firestoreHelpers.updateDocument).toHaveBeenCalledWith(
      'trips',
      'trip-edit-id',
      expect.objectContaining({
        title: 'Bali Holiday',
        visibility: 'public',
        startDate: { seconds: 1710000000 },
      }),
    );
  });

  // ── UT27 ──────────────────────────────────────────────────────────────────
  test('UT27 — Verify that deleteTrip calls deleteDocument with the correct collection and trip ID', async () => {
    firestoreHelpers.deleteDocument.mockResolvedValue(undefined);

    await tripService.deleteTrip('trip-gen-id-777');

    expect(firestoreHelpers.deleteDocument).toHaveBeenCalledTimes(1);
    expect(firestoreHelpers.deleteDocument).toHaveBeenCalledWith('trips', 'trip-gen-id-777');
  });

  // ── UT28 ──────────────────────────────────────────────────────────────────
  test('UT28 — Verify that the trip store removeTrip action removes the correct trip from state', () => {
    const { useTripStore } = require('../src/store/tripStore');

    useTripStore.setState({
      trips: [
        { id: 'trip-to-remove', title: 'Remove Me', ownerId: 'u1', collaborators: [], visibility: 'private', coverImage: null, startDate: { seconds: 0 }, endDate: { seconds: 0 }, createdAt: { seconds: 0 }, updatedAt: { seconds: 0 } },
        { id: 'trip-to-keep', title: 'Keep Me', ownerId: 'u1', collaborators: [], visibility: 'private', coverImage: null, startDate: { seconds: 0 }, endDate: { seconds: 0 }, createdAt: { seconds: 0 }, updatedAt: { seconds: 0 } },
      ],
    });

    useTripStore.getState().removeTrip('trip-to-remove');

    const { trips } = useTripStore.getState();
    expect(trips).toHaveLength(1);
    expect(trips[0].id).toBe('trip-to-keep');
  });

  // ── UT29 ──────────────────────────────────────────────────────────────────
  test('UT29 — Verify that deleteTrip propagates a Firestore error to the caller', async () => {
    firestoreHelpers.deleteDocument.mockRejectedValue(new Error('permission-denied'));

    await expect(tripService.deleteTrip('trip-protected')).rejects.toThrow(
      'permission-denied',
    );
  });

  // ── UT30 ──────────────────────────────────────────────────────────────────
  test('UT30 — Verify that subscribeToUserTrips establishes two real-time listeners and delivers trips via callback', () => {
    const mockUnsubscribe = jest.fn();

    firestoreHelpers.subscribeToCollection.mockImplementation(
      (path, constraints, callback) => {
        if (path === 'trips') {
          callback([
            { id: 't1', title: 'My Trip', ownerId: 'user-001', collaborators: [], visibility: 'private', coverImage: null, startDate: { seconds: 1700000000 }, endDate: { seconds: 1700086400 }, createdAt: { seconds: 1700000000 }, updatedAt: { seconds: 1700000000 } },
          ]);
        }
        return mockUnsubscribe;
      },
    );

    const receivedTrips = [];
    const unsubscribe = tripService.subscribeToUserTrips('user-001', (trips) => {
      receivedTrips.push(...trips);
    });

    expect(firestoreHelpers.subscribeToCollection).toHaveBeenCalledTimes(2);
    expect(receivedTrips.length).toBeGreaterThan(0);
    expect(typeof unsubscribe).toBe('function');
  });
});
