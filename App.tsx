import './global.css';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Constants from 'expo-constants';
import { useAuth } from '@hooks/useAuth';
import RootNavigator from '@navigation/RootNavigator';

// #region agent log
fetch('http://127.0.0.1:7510/ingest/575753d7-1369-4343-91b5-6ed35c9c2611',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'44c61c'},body:JSON.stringify({sessionId:'44c61c',location:'App.tsx:module-load',message:'App module loaded',data:{executionEnv:Constants.executionEnvironment,appOwnership:(Constants as any).appOwnership},hypothesisId:'H_A',timestamp:Date.now()})}).catch(()=>{});
// #endregion

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
