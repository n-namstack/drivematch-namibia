import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AuthProvider } from './app/context/AuthContext';
import { NetworkProvider } from './app/context/NetworkContext';
import AppNavigator from './app/navigation';
import ErrorBoundary from './app/components/ErrorBoundary';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <SafeAreaProvider>
          <NetworkProvider>
            <AuthProvider>
              <StatusBar style="auto" />
              <AppNavigator />
              <Toast />
            </AuthProvider>
          </NetworkProvider>
        </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
