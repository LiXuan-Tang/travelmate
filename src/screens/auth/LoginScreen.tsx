import React, { useState } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithGoogle } from '@services/firebase/auth';
import { Button } from '@components/ui';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign in failed.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-8">

        {/* Brand */}
        <View className="mb-12">
          <Text className="text-3xl font-bold text-primary tracking-tight">TravelMate</Text>
          <Text className="text-sm text-muted-foreground mt-1.5">Plan your next adventure.</Text>
        </View>

        {/* Card */}
        <View className="bg-surface rounded-2xl border border-border p-6">
          <Text className="text-lg font-semibold text-foreground mb-1">Sign in</Text>
          <Text className="text-sm text-muted-foreground mb-7 leading-5">
            Use your Google account to continue.
          </Text>

          {loading ? (
            <View className="py-3 items-center">
              <ActivityIndicator size="small" color="#006a66" />
            </View>
          ) : (
            <Button
              variant="outline"
              size="lg"
              onPress={handleGoogleSignIn}
              className="w-full"
            >
              <View className="flex-row items-center justify-center gap-3">
                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                  <Text className="text-white text-xs font-bold">G</Text>
                </View>
                <Text className="text-sm font-semibold text-foreground">Continue with Google</Text>
              </View>
            </Button>
          )}
        </View>

        {/* Footer */}
        <Text className="text-xs text-muted-foreground text-center mt-6 leading-5">
          By continuing, you agree to our{' '}
          <Text className="text-primary font-medium">Terms of Service</Text>
          {' '}and{' '}
          <Text className="text-primary font-medium">Privacy Policy</Text>.
        </Text>
      </View>
    </SafeAreaView>
  );
}
