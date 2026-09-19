import 'react-native-reanimated';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { getSession } from './src/auth/authStore';
import { useAutoSync } from './src/sync/useAutoSync';
import { colors } from './src/constants/theme';

export default function App() {
  const [initialRouteName, setInitialRouteName] = useState<'Login' | 'ProjectList' | null>(null);

  useEffect(() => {
    getSession().then((session) => setInitialRouteName(session ? 'ProjectList' : 'Login'));
  }, []);

  useAutoSync();

  if (!initialRouteName) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <RootNavigator initialRouteName={initialRouteName} />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
