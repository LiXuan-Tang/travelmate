import { Trip } from '@app-types/index';
import { COLLECTIONS } from '@constants/index';
import {
  createDocument,
  updateDocument,
  deleteDocument,
  subscribeToCollection,
  where,
} from './firestore';

export const subscribeToUserTrips = (
  userId: string,
  callback: (trips: Trip[]) => void,
): (() => void) => {
  // Two real-time listeners: trips owned by user + trips where user is a collaborator
  let ownedTrips: Trip[] = [];
  let collaboratorTrips: Trip[] = [];

  const merge = () => {
    const combined = [...ownedTrips];
    collaboratorTrips.forEach((t) => {
      if (!combined.find((c) => c.id === t.id)) combined.push(t);
    });
    combined.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
    callback(combined);
  };

  const unsubOwned = subscribeToCollection<Trip>(
    COLLECTIONS.TRIPS,
    [where('ownerId', '==', userId)],
    (data) => {
      ownedTrips = data;
      merge();
    },
  );

  const unsubCollab = subscribeToCollection<Trip>(
    COLLECTIONS.TRIPS,
    [where('collaborators', 'array-contains', userId)],
    (data) => {
      collaboratorTrips = data;
      merge();
    },
  );

  return () => {
    unsubOwned();
    unsubCollab();
  };
};

export const createTrip = async (
  data: Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> => {
  return createDocument(COLLECTIONS.TRIPS, data);
};

export const updateTrip = async (id: string, data: Partial<Trip>): Promise<void> => {
  return updateDocument(COLLECTIONS.TRIPS, id, data);
};

export const deleteTrip = async (id: string): Promise<void> => {
  return deleteDocument(COLLECTIONS.TRIPS, id);
};
