import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { ProjectListScreen } from '../screens/ProjectListScreen';
import { ProjectViewerScreen } from '../screens/ProjectViewerScreen';
import type { RootStackParamList } from './types';
import { colors } from '../constants/theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  initialRouteName: keyof RootStackParamList;
};

export function RootNavigator({ initialRouteName }: Props) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ProjectList" component={ProjectListScreen} options={{ title: 'Объекты' }} />
      <Stack.Screen name="ProjectViewer" component={ProjectViewerScreen} />
    </Stack.Navigator>
  );
}
