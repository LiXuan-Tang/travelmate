import { useEffect, useState, useCallback } from 'react';
import { serverTimestamp } from 'firebase/firestore';
import { Destination } from '@app-types/index';
import { useTripStore } from '@store/tripStore';
import {
  subscribeToDestinations,
  addDestination as addDestinationService,
  updateDestination as updateDestinationService,
  removeDestination as removeDestinationService,
} from '@services/firebase/destinations';

export const useDestinations = (tripId: string) => {
  const { destinations, setDestinations, updateDestination: storeUpdateDestination } = useTripStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tripId) return;
    const unsub = subscribeToDestinations(tripId, (data) => {
      setDestinations(data);
    });
    return unsub;
  }, [tripId, setDestinations]);

  const addDestination = useCallback(
    async (data: Omit<Destination, 'id' | 'createdAt' | 'tripId'>): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await addDestinationService(tripId, {
          ...data,
          tripId,
          // date defaults to now if not provided
          date: data.date ?? (serverTimestamp() as Destination['date']),
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to add destination');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [tripId],
  );

  const updateDestination = useCallback(
    async (destId: string, data: Partial<Destination>): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        storeUpdateDestination(destId, data);
        await updateDestinationService(tripId, destId, data);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update destination');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [tripId, storeUpdateDestination],
  );

  const reorderDestinations = useCallback(
    async (ordered: Destination[]): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all(
          ordered.map((dest, index) =>
            updateDestinationService(tripId, dest.id, { order: index }),
          ),
        );
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to reorder destinations');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [tripId],
  );

  const removeDestination = useCallback(
    async (destId: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await removeDestinationService(tripId, destId);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to remove destination');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [tripId],
  );

  return { destinations, isLoading, error, addDestination, updateDestination, reorderDestinations, removeDestination };
};
