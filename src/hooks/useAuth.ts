import { useEffect } from 'react';
import { subscribeToAuthChanges } from '@services/firebase/auth';
import { subscribeToDocument } from '@services/firebase/firestore';
import { useAuthStore } from '@store/authStore';
import { UserProfile } from '@app-types/index';
import { COLLECTIONS } from '@constants/index';

export const useAuth = () => {
  const { setUser, setProfile, setLoading, reset } = useAuthStore();

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = subscribeToAuthChanges((firebaseUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = undefined;

      if (firebaseUser) {
        setUser(firebaseUser);
        unsubscribeProfile = subscribeToDocument<UserProfile>(
          COLLECTIONS.USERS,
          firebaseUser.uid,
          (profile) => setProfile(profile),
        );
      } else {
        reset();
      }

      setLoading(false);
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);
};
