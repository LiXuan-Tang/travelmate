import './global.css';
import React from 'react';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@hooks/useAuth';
import { useAccountContinuePrompt } from '@hooks/useAccountContinuePrompt';
import RootNavigator from '@navigation/RootNavigator';
import { RootStackParamList } from '@app-types/index';
import { AccountContinueModal } from '@components/ui';

/**
 * Deep-link configuration.
 *
 * Handles both:
 *   travelmate://shared-trip/{postId}        — custom scheme (opened from the
 *                                               web redirect page when app is installed)
 *   https://travelmate-2f670.web.app/trip/{postId} — HTTPS App Link / Universal Link
 *                                               (requires assetlinks.json / AASA setup)
 */
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [
    'travelmate://',
    'https://travelmate-2f670.web.app',
  ],
  config: {
    screens: {
      // Top-level screen accessible without auth
      SharedTripDetail: {
        path: 'shared-trip/:postId',
        parse: { postId: (id: string) => id },
      },
      Main: {
        screens: {
          Community: 'community',
        },
      },
    },
  },
};

function AppContent() {
  useAuth();
  const {
    accountModalVisible,
    accountModalSigningOut,
    accountModalEmail,
    accountModalDisplayName,
    onAccountContinue,
    onAccountSwitch,
  } = useAccountContinuePrompt();

  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
      <AccountContinueModal
        visible={accountModalVisible}
        email={accountModalEmail}
        displayName={accountModalDisplayName}
        isSigningOut={accountModalSigningOut}
        onContinue={onAccountContinue}
        onUseDifferentAccount={onAccountSwitch}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer linking={linking}>
        <AppContent />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
