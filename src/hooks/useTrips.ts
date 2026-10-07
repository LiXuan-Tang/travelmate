import { useEffect, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '@store/authStore';
import { useTripStore } from '@store/tripStore';
import { uploadImage, deleteImage } from '@services/firebase/index';
import {
  subscribeToUserTrips,
  createTrip as firestoreCreateTrip,
  updateTrip as firestoreUpdateTrip,
  deleteTrip as firestoreDeleteTrip,
} from '@services/firebase/trips';
import { Trip } from '@app-types/index';

export interface TripFormData {
  title: string;
  startDate: Date;
  endDate: Date;
  coverImageUri?: string | null;
}

export const useTrips = ({ subscribe = true }: { subscribe?: boolean } = {}) => {
  const { user } = useAuthStore();
  const { setTrips, addTrip, updateTrip, removeTrip, setLoading, setError, isLoading } =
    useTripStore();

  useEffect(() => {
    if (!user || !subscribe) return;

    const unsubscribe = subscribeToUserTrips(user.uid, (trips) => {
      setTrips(trips);
    });

    return unsubscribe;
  }, [user, subscribe]);

  const createTrip = useCallback(
    async (formData: TripFormData): Promise<string | null> => {
      if (!user) return null;
      setLoading(true);
      setError(null);
      try {
        let coverImage: string | null = null;

        if (formData.coverImageUri) {
          const path = `trips/${user.uid}/${Date.now()}.jpg`;
          coverImage = await uploadImage(formData.coverImageUri, path);
        }

        const id = await firestoreCreateTrip({
          title: formData.title.trim(),
          coverImage,
          startDate: Timestamp.fromDate(formData.startDate),
          endDate: Timestamp.fromDate(formData.endDate),
          visibility: 'private',
          ownerId: user.uid,
          collaborators: [],
        });

        return id;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to create trip');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const editTrip = useCallback(
    async (tripId: string, formData: TripFormData, existingCoverImage?: string | null): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        let coverImage: string | null = existingCoverImage ?? null;

        if (formData.coverImageUri && formData.coverImageUri !== existingCoverImage) {
          // Upload new image
          const path = `trips/${user.uid}/${Date.now()}.jpg`;
          coverImage = await uploadImage(formData.coverImageUri, path);

          // Delete old image from Storage if it was a Firebase URL
          if (existingCoverImage && existingCoverImage.includes('firebasestorage')) {
            try {
              const urlPath = decodeURIComponent(
                existingCoverImage.split('/o/')[1].split('?')[0],
              );
              await deleteImage(urlPath);
            } catch {
              // Non-fatal: old image cleanup failure
            }
          }
        }

        await firestoreUpdateTrip(tripId, {
          title: formData.title.trim(),
          coverImage,
          startDate: Timestamp.fromDate(formData.startDate),
          endDate: Timestamp.fromDate(formData.endDate),
        });

        updateTrip(tripId, {
          title: formData.title.trim(),
          coverImage,
          startDate: Timestamp.fromDate(formData.startDate),
          endDate: Timestamp.fromDate(formData.endDate),
        });

        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to update trip');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const deleteTrip = useCallback(
    async (tripId: string, coverImage?: string | null): Promise<boolean> => {
      if (!user) return false;
      setLoading(true);
      setError(null);
      try {
        await firestoreDeleteTrip(tripId);

        if (coverImage && coverImage.includes('firebasestorage')) {
          try {
            const urlPath = decodeURIComponent(
              coverImage.split('/o/')[1].split('?')[0],
            );
            await deleteImage(urlPath);
          } catch {
            // Non-fatal
          }
        }

        removeTrip(tripId);
        return true;
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to delete trip');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [user],
  );

  const pickCoverImage = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return null;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      return result.assets[0].uri;
    }
    return null;
  }, []);

  return { createTrip, editTrip, deleteTrip, pickCoverImage, isLoading };
};
