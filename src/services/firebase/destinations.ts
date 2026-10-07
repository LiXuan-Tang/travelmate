import { Destination } from '@app-types/index';
import { COLLECTIONS } from '@constants/index';
import {
  createDocument,
  updateDocument,
  deleteDocument,
  subscribeToCollection,
  orderBy,
} from './firestore';
const destPath = (tripId: string) =>
  `${COLLECTIONS.TRIPS}/${tripId}/${COLLECTIONS.DESTINATIONS}`;

export const subscribeToDestinations = (
  tripId: string,
  callback: (destinations: Destination[]) => void,
): (() => void) =>
  subscribeToCollection<Destination>(
    destPath(tripId),
    [orderBy('order', 'asc')],
    callback,
  );

export const addDestination = async (
  tripId: string,
  data: Omit<Destination, 'id' | 'createdAt'>,
): Promise<string> => {
  if (!data.placeId?.trim() || !data.name?.trim()) {
    throw new Error('A valid place with a name is required');
  }
  return createDocument(destPath(tripId), data);
};

export const updateDestination = async (
  tripId: string,
  destId: string,
  data: Partial<Destination>,
): Promise<void> => updateDocument(destPath(tripId), destId, data);

export const removeDestination = async (
  tripId: string,
  destId: string,
): Promise<void> => deleteDocument(destPath(tripId), destId);
