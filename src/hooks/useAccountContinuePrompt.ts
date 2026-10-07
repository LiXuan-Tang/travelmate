import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@store/authStore';
import { logoutUser } from '@services/firebase/auth';

/**
 * After auth finishes loading, prompt signed-in users once when a persisted session
 * is restored (app cold start or full browser load).
 *
 * We intentionally do not listen to AppState: returning from the image picker,
 * permission dialogs, or switching browser tabs also toggles active/background and
 * would spam this modal.
 */
export function useAccountContinuePrompt(): {
  accountModalVisible: boolean;
  accountModalSigningOut: boolean;
  accountModalEmail: string | null;
  accountModalDisplayName: string | null;
  onAccountContinue: () => void;
  onAccountSwitch: () => void;
} {
  const { user, isLoading } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  /** Tracks previous `isLoading` to detect the initial auth resolve (persisted session). */
  const prevIsLoadingRef = useRef(true);

  useEffect(() => {
    const prevIsLoading = prevIsLoadingRef.current;

    if (!user) {
      setVisible(false);
      setSigningOut(false);
      prevIsLoadingRef.current = isLoading;
      return;
    }

    if (isLoading) {
      prevIsLoadingRef.current = isLoading;
      return;
    }

    if (prevIsLoading) {
      setVisible(true);
    }
    prevIsLoadingRef.current = false;
  }, [user, isLoading]);

  const onAccountContinue = () => setVisible(false);

  const onAccountSwitch = async () => {
    setSigningOut(true);
    try {
      await logoutUser();
      setVisible(false);
    } catch (e) {
      console.error('[TravelMate] Switch account sign-out failed:', e);
    } finally {
      setSigningOut(false);
    }
  };

  return {
    accountModalVisible: visible,
    accountModalSigningOut: signingOut,
    accountModalEmail: user?.email ?? null,
    accountModalDisplayName: user?.displayName ?? null,
    onAccountContinue,
    onAccountSwitch,
  };
}
