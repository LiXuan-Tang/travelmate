/**
 * itinerary.test.js
 *
 * Module 4 — Itinerary Management
 * Covers UT31–UT43
 *
 *   UT31 — Verify that addDestination writes to the correct Firestore sub-collection path
 *   UT32 — Verify that a destination with a base date is grouped into Day 1
 *   UT33 — Verify that a destination dated one day later is grouped into Day 2
 *   UT34 — Verify that updateDestination writes updated notes and order fields to Firestore
 *   UT35 — Verify that removeDestination calls deleteDocument with the correct path and document ID
 *   UT36 — Verify that removing a destination reduces the item count in its day bucket
 *   UT37 — Verify that updateDestination is called for each reordered item with its new order value
 *   UT38 — Verify that groupDestinationsByDay sorts items within a day according to their order field
 *   UT39 — Verify that the trip store removeDestination action immediately removes the item from state
 *   UT40 — Verify that the trip store updateDestination action immediately updates the item in state
 *   UT41 — Verify that addDestination rejects a destination payload with a missing placeId
 *   UT42 — Verify that addDestination rejects a destination payload with a missing name
 *   UT43 — Verify that subscribeToDestinations sets up a real-time listener and delivers the initial data set
 */

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../src/services/firebase/firestore', () => ({
  createDocument: jest.fn(),
  updateDocument: jest.fn(),
  deleteDocument: jest.fn(),
  subscribeToCollection: jest.fn(() => jest.fn()),
  orderBy: jest.fn((...args) => args),
}));

const { groupDestinationsByDay } = require('../src/utils/itinerary');
const destService = require('../src/services/firebase/destinations');
const firestoreHelpers = require('../src/services/firebase/firestore');

const DAY_S = 86400;
const BASE_S = 1_700_000_000;

/** Minimal Destination fixture */
const makeDestination = (overrides = {}) => ({
  id: 'd1',
  tripId: 'trip-1',
  placeId: 'place-1',
  name: 'Default Place',
  address: '1 Street',
  lat: 35.68,
  lng: 139.69,
  photoReference: null,
  notes: '',
  order: 0,
  date: { seconds: BASE_S },
  createdAt: { seconds: BASE_S },
  ...overrides,
});

describe('Itinerary', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── UT31 ──────────────────────────────────────────────────────────────────
  describe('UT31 — Verify that addDestination writes to the correct Firestore sub-collection path', () => {
    test('UT31 — Verify that addDestination writes to the correct Firestore sub-collection path', async () => {
      firestoreHelpers.createDocument.mockResolvedValue('dest-new-001');

      const id = await destService.addDestination('trip-1', {
        tripId: 'trip-1',
        placeId: 'place-abc',
        name: 'Shibuya Crossing',
        address: 'Shibuya, Tokyo',
        lat: 35.66,
        lng: 139.7,
        photoReference: null,
        notes: '',
        order: 0,
        date: { seconds: BASE_S },
      });

      expect(firestoreHelpers.createDocument).toHaveBeenCalledWith(
        'trips/trip-1/destinations',
        expect.objectContaining({ name: 'Shibuya Crossing' }),
      );
      expect(id).toBe('dest-new-001');
    });
  });

  // ── UT32 + UT33 ───────────────────────────────────────────────────────────
  describe('UT32–UT33 — Verify that destinations are bucketed into the correct travel day', () => {
    test('UT32 — Verify that a destination with a base date is grouped into Day 1', () => {
      const destinations = [makeDestination({ id: 'd1', name: 'Park', order: 0 })];
      const result = groupDestinationsByDay(destinations);

      expect(result).toHaveLength(1);
      expect(result[0].day).toBe(1);
      expect(result[0].items[0].name).toBe('Park');
    });

    test('UT33 — Verify that a destination dated one day later is grouped into Day 2', () => {
      const destinations = [
        makeDestination({ id: 'd1', name: 'Day-1 Place', date: { seconds: BASE_S } }),
        makeDestination({ id: 'd2', name: 'Day-2 Place', date: { seconds: BASE_S + DAY_S } }),
      ];
      const result = groupDestinationsByDay(destinations);

      expect(result).toHaveLength(2);
      expect(result[0].items[0].name).toBe('Day-1 Place');
      expect(result[1].items[0].name).toBe('Day-2 Place');
    });
  });

  // ── UT34 ──────────────────────────────────────────────────────────────────
  describe('UT34 — Verify that updateDestination writes updated notes and order fields to Firestore', () => {
    test('UT34 — Verify that updateDestination writes updated notes and order fields to Firestore', async () => {
      firestoreHelpers.updateDocument.mockResolvedValue(undefined);

      await destService.updateDestination('trip-1', 'dest-abc', {
        notes: 'Visit in the morning',
        order: 2,
      });

      expect(firestoreHelpers.updateDocument).toHaveBeenCalledWith(
        'trips/trip-1/destinations',
        'dest-abc',
        expect.objectContaining({ notes: 'Visit in the morning', order: 2 }),
      );
    });
  });

  // ── UT35 + UT36 ───────────────────────────────────────────────────────────
  describe('UT35–UT36 — Verify itinerary item deletion', () => {
    test('UT35 — Verify that removeDestination calls deleteDocument with the correct path and document ID', async () => {
      firestoreHelpers.deleteDocument.mockResolvedValue(undefined);

      await destService.removeDestination('trip-1', 'dest-456');

      expect(firestoreHelpers.deleteDocument).toHaveBeenCalledWith(
        'trips/trip-1/destinations',
        'dest-456',
      );
    });

    test('UT36 — Verify that removing a destination reduces the item count in its day bucket', () => {
      const all = [
        makeDestination({ id: 'd1', name: 'Museum', order: 0 }),
        makeDestination({ id: 'd2', name: 'Park', order: 1 }),
      ];

      const remaining = all.filter((d) => d.id !== 'd1');
      const result = groupDestinationsByDay(remaining);

      expect(result[0].items).toHaveLength(1);
      expect(result[0].items[0].name).toBe('Park');
    });
  });

  // ── UT37 + UT38 ───────────────────────────────────────────────────────────
  describe('UT37–UT38 — Verify drag-and-drop reorder behaviour', () => {
    test('UT37 — Verify that updateDestination is called for each reordered item with its new order value', async () => {
      firestoreHelpers.updateDocument.mockResolvedValue(undefined);

      await destService.updateDestination('trip-1', 'd1', { order: 1 });
      await destService.updateDestination('trip-1', 'd2', { order: 0 });

      expect(firestoreHelpers.updateDocument).toHaveBeenCalledTimes(2);
      expect(firestoreHelpers.updateDocument).toHaveBeenCalledWith(
        'trips/trip-1/destinations',
        'd1',
        expect.objectContaining({ order: 1 }),
      );
      expect(firestoreHelpers.updateDocument).toHaveBeenCalledWith(
        'trips/trip-1/destinations',
        'd2',
        expect.objectContaining({ order: 0 }),
      );
    });

    test('UT38 — Verify that groupDestinationsByDay sorts items within a day according to their order field', () => {
      const destinations = [
        makeDestination({ id: 'd1', name: 'First (was second)', order: 0 }),
        makeDestination({ id: 'd2', name: 'Second (was first)', order: 1 }),
      ];

      const reordered = destinations.map((d, i) => ({
        ...d,
        order: i === 0 ? 1 : 0,
      }));
      const result = groupDestinationsByDay(reordered);

      expect(result[0].items[0].name).toBe('Second (was first)'); // order 0
      expect(result[0].items[1].name).toBe('First (was second)'); // order 1
    });
  });

  // ── UT39 + UT40 ───────────────────────────────────────────────────────────
  describe('UT39–UT40 — Verify trip store immediate state updates', () => {
    test('UT39 — Verify that the trip store removeDestination action immediately removes the item from state', () => {
      const { useTripStore } = require('../src/store/tripStore');

      useTripStore.setState({
        destinations: [
          makeDestination({ id: 'd-keep' }),
          makeDestination({ id: 'd-remove', name: 'To Remove' }),
        ],
      });

      useTripStore.getState().removeDestination('d-remove');

      const { destinations } = useTripStore.getState();
      expect(destinations).toHaveLength(1);
      expect(destinations[0].id).toBe('d-keep');
    });

    test('UT40 — Verify that the trip store updateDestination action immediately updates the item in state', () => {
      const { useTripStore } = require('../src/store/tripStore');

      useTripStore.setState({
        destinations: [makeDestination({ id: 'd-update', notes: 'Old note' })],
      });

      useTripStore.getState().updateDestination('d-update', { notes: 'New note' });

      const { destinations } = useTripStore.getState();
      expect(destinations[0].notes).toBe('New note');
    });
  });

  // ── UT41 + UT42 ───────────────────────────────────────────────────────────
  describe('UT41–UT42 — Verify that invalid destination payloads are rejected', () => {
    test('UT41 — Verify that addDestination rejects a destination payload with a missing placeId', async () => {
      await expect(
        destService.addDestination('trip-1', {
          tripId: 'trip-1',
          placeId: '',
          name: 'Some Place',
          address: 'Addr',
          lat: 0,
          lng: 0,
          photoReference: null,
          notes: '',
          order: 0,
          date: { seconds: BASE_S },
        }),
      ).rejects.toThrow('A valid place with a name is required');

      expect(firestoreHelpers.createDocument).not.toHaveBeenCalled();
    });

    test('UT42 — Verify that addDestination rejects a destination payload with a missing name', async () => {
      await expect(
        destService.addDestination('trip-1', {
          tripId: 'trip-1',
          placeId: 'place-abc',
          name: '',
          address: 'Addr',
          lat: 0,
          lng: 0,
          photoReference: null,
          notes: '',
          order: 0,
          date: { seconds: BASE_S },
        }),
      ).rejects.toThrow('A valid place with a name is required');

      expect(firestoreHelpers.createDocument).not.toHaveBeenCalled();
    });
  });

  // ── UT43 ──────────────────────────────────────────────────────────────────
  describe('UT43 — Verify that subscribeToDestinations sets up a real-time listener and delivers the initial data set', () => {
    test('UT43 — Verify that subscribeToDestinations sets up a real-time listener and delivers the initial data set', () => {
      const mockUnsubscribe = jest.fn();
      const receivedDests = [];

      firestoreHelpers.subscribeToCollection.mockImplementation(
        (_path, _constraints, callback) => {
          callback([makeDestination({ id: 'd-persisted', name: 'Persistent Place' })]);
          return mockUnsubscribe;
        },
      );

      const unsubscribe = destService.subscribeToDestinations('trip-1', (dests) => {
        receivedDests.push(...dests);
      });

      expect(firestoreHelpers.subscribeToCollection).toHaveBeenCalledWith(
        'trips/trip-1/destinations',
        expect.anything(),
        expect.any(Function),
      );
      expect(receivedDests[0].name).toBe('Persistent Place');
      expect(typeof unsubscribe).toBe('function');
    });
  });
});
