import { useEffect } from 'react';
import { subscribeToAuthChanges } from '@services/firebase/auth';
import { getDocument } from '@services/firebase/firestore';
import { useAuthStore } from '@store/authStore';
import { UserProfile } from '@app-types/index';
import { COLLECTIONS } from '@constants/index';

export const useAuth = () => {
  const { setUser, setProfile, setLoading, reset } = useAuthStore();

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const profile = await getDocument<UserProfile>(COLLECTIONS.USERS, firebaseUser.uid);
        setProfile(profile);
      } else {
        reset();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
};
