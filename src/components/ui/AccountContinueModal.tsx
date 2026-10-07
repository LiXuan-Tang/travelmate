import React from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  email: string | null;
  displayName: string | null;
  isSigningOut: boolean;
  onContinue: () => void;
  onUseDifferentAccount: () => void;
}

export function AccountContinueModal({
  visible,
  email,
  displayName,
  isSigningOut,
  onContinue,
  onUseDifferentAccount,
}: Props) {
  const subtitle = displayName && email ? `${displayName}\n${email}` : email ?? 'Your Google account';

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onContinue}>
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="bg-surface rounded-3xl w-full overflow-hidden border border-border">
          <View className="px-6 pt-6 pb-4 border-b border-border">
            <View className="flex-row items-center gap-x-2 mb-1">
              <Feather name="log-in" size={18} color="#006a66" />
              <Text className="text-lg font-bold text-foreground">Sign in</Text>
            </View>
            <Text className="text-xs text-muted-foreground leading-5">
              Choose whether to keep using this account or pick a different Google account.
            </Text>
          </View>

          <View className="px-6 pt-5 pb-2">
            <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Continue as
            </Text>
            <View className="bg-muted rounded-2xl px-4 py-3 mb-5 border border-border/60">
              <Text className="text-sm font-semibold text-foreground leading-5">{subtitle}</Text>
            </View>

            <TouchableOpacity
              onPress={onContinue}
              disabled={isSigningOut}
              activeOpacity={0.75}
              className="bg-primary rounded-2xl py-3.5 items-center justify-center mb-3"
            >
              <Text className="text-sm font-semibold text-white">Continue with this account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onUseDifferentAccount}
              disabled={isSigningOut}
              activeOpacity={0.75}
              className="border border-border rounded-2xl py-3.5 items-center justify-center flex-row gap-2"
            >
              {isSigningOut ? (
                <ActivityIndicator size="small" color="#006a66" />
              ) : null}
              <Text className="text-sm font-semibold text-foreground">Use a different Google account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
