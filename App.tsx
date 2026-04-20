import './global.css';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@hooks/useAuth';
import RootNavigator from '@navigation/RootNavigator';



function AppContent() {
  useAuth();
  return (
    <>
      <StatusBar style="auto" />
      <RootNavigator />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppContent />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
